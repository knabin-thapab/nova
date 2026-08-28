# Hugging Face ZeroGPU initialization - MUST BE FIRST LINE BEFORE TORCH OR CUDA
try:
    import spaces
    HAS_SPACES = True
except ImportError:
    spaces = None
    HAS_SPACES = False

import os
import sys
import time
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import cv2
from typing import Optional, Dict, Any, List
import urllib.request

from .models import RestorationModel, registry
from .runtime import zerogpu_gpu, get_runtime_mode

# Enable optimal PyTorch CPU threading when on CPU
if torch.get_num_threads() < (os.cpu_count() or 4):
    torch.set_num_threads(os.cpu_count() or 4)

# Enable cuDNN autotuner for fixed-size inputs (video frames)
if torch.cuda.is_available():
    torch.backends.cudnn.benchmark = True
    torch.backends.cudnn.enabled = True


WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)

# Official Real-ESRGAN & Real-ESRNet model weights
REALESRGAN_X4_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
REALESRGAN_X4_PATH = os.path.join(WEIGHTS_DIR, "RealESRGAN_x4plus.pth")

REALESRNET_X4_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.1/RealESRNet_x4plus.pth"
REALESRNET_X4_PATH = os.path.join(WEIGHTS_DIR, "RealESRNet_x4plus.pth")

REALESRGAN_ANIME_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth"
REALESRGAN_ANIME_PATH = os.path.join(WEIGHTS_DIR, "RealESRGAN_x4plus_anime_6B.pth")


# ---------------------
# RRDBNet Architecture (official Real-ESRGAN / Real-ESRNet backbone)
# ---------------------
class ResidualDenseBlock(nn.Module):
    def __init__(self, num_feat=64, num_grow_ch=32):
        super().__init__()
        self.conv1 = nn.Conv2d(num_feat, num_grow_ch, 3, 1, 1)
        self.conv2 = nn.Conv2d(num_feat + num_grow_ch, num_grow_ch, 3, 1, 1)
        self.conv3 = nn.Conv2d(num_feat + 2 * num_grow_ch, num_grow_ch, 3, 1, 1)
        self.conv4 = nn.Conv2d(num_feat + 3 * num_grow_ch, num_grow_ch, 3, 1, 1)
        self.conv5 = nn.Conv2d(num_feat + 4 * num_grow_ch, num_feat, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, num_feat, num_grow_ch=32):
        super().__init__()
        self.rdb1 = ResidualDenseBlock(num_feat, num_grow_ch)
        self.rdb2 = ResidualDenseBlock(num_feat, num_grow_ch)
        self.rdb3 = ResidualDenseBlock(num_feat, num_grow_ch)

    def forward(self, x):
        out = self.rdb1(x)
        out = self.rdb2(out)
        out = self.rdb3(out)
        return out * 0.2 + x


class RRDBNet(nn.Module):
    """Official RRDBNet architecture used by Real-ESRGAN and Real-ESRNet."""
    def __init__(self, num_in_ch=3, num_out_ch=3, scale=4, num_feat=64, num_block=23, num_grow_ch=32):
        super().__init__()
        self.scale = scale
        self.conv_first = nn.Conv2d(num_in_ch, num_feat, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(num_feat=num_feat, num_grow_ch=num_grow_ch) for _ in range(num_block)])
        self.conv_body = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        # upsample
        self.conv_up1 = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_hr = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_last = nn.Conv2d(num_feat, num_out_ch, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x):
        feat = self.conv_first(x)
        body_feat = self.conv_body(self.body(feat))
        feat = feat + body_feat
        # upsample 2x
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode='nearest')))
        # upsample 2x again (total 4x)
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode='nearest')))
        out = self.conv_last(self.lrelu(self.conv_hr(feat)))
        return out


def download_weights(url: str, dest: str):
    """Download model weights if missing or corrupted."""
    if os.path.exists(dest) and os.path.getsize(dest) > 1_000_000:
        return
    print(f"[*] Downloading AI model weights ({os.path.basename(dest)})...", flush=True)
    try:
        urllib.request.urlretrieve(url, dest)
        print(f"[+] Model weights downloaded: {os.path.getsize(dest) / 1e6:.1f} MB", flush=True)
    except Exception as e:
        print(f"[!] Failed to download weights from {url}: {e}", flush=True)


# Global state-dict cache
_WEIGHTS_CACHE: Dict[str, Dict[str, torch.Tensor]] = {}


def _log_gpu_diagnostics(context: str = ""):
    """Emit truthful GPU diagnostics to stderr."""
    prefix = f"[GPU] {context} " if context else "[GPU] "
    print(f"{prefix}CUDA available: {torch.cuda.is_available()}", file=sys.stderr, flush=True)
    if torch.cuda.is_available():
        print(f"{prefix}Device count: {torch.cuda.device_count()}", file=sys.stderr, flush=True)
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            alloc = torch.cuda.memory_allocated(i)
            reserved = torch.cuda.memory_reserved(i)
            print(f"{prefix}GPU {i}: {props.name}", file=sys.stderr, flush=True)
            print(f"{prefix}  VRAM total:     {props.total_mem / (1024**3):.2f} GB", file=sys.stderr, flush=True)
            print(f"{prefix}  VRAM allocated: {alloc / (1024**3):.2f} GB", file=sys.stderr, flush=True)
            print(f"{prefix}  VRAM reserved:  {reserved / (1024**3):.2f} GB", file=sys.stderr, flush=True)
        print(f"{prefix}PyTorch CUDA version: {torch.version.cuda}", file=sys.stderr, flush=True)
        print(f"{prefix}cuDNN available: {torch.backends.cudnn.is_available()}", file=sys.stderr, flush=True)
        print(f"{prefix}cuDNN benchmark: {torch.backends.cudnn.benchmark}", file=sys.stderr, flush=True)
    else:
        print(f"{prefix}WARNING: No CUDA GPU detected — running CPU fallback. "
              f"Performance will be significantly slower.", file=sys.stderr, flush=True)


def get_adaptive_batch_size(h: int, w: int, device: torch.device) -> int:
    """
    Determines optimal batch size based on VRAM budget and frame resolution.
    Conservative estimate: RRDBNet 23-block ~60MB params, per-frame activation ~(H*W*64*4*3) bytes.
    """
    if device.type != 'cuda':
        return 1  # CPU: always batch=1 to limit RAM

    try:
        free_bytes, total_bytes = torch.cuda.mem_get_info(device)
        free_gb = free_bytes / (1024 ** 3)
    except Exception:
        free_gb = 2.0  # conservative fallback

    # Per-frame VRAM estimate (empirical): ~0.4 GB per 640x360 frame at FP16
    pixels = h * w
    per_frame_gb = (pixels / (640 * 360)) * 0.4

    # Reserve 0.5 GB for model weights and overhead
    usable_gb = max(free_gb - 0.5, 0.5)
    max_batch = max(1, int(usable_gb / max(per_frame_gb, 0.1)))

    # Clamp to sensible range
    return min(max_batch, 8)


class RealESRGANEngine(RestorationModel):
    """
    Production-grade Super-Resolution Inference Engine.
    Supports:
      - Real-ESRNet (Clean, natural, artifact-free photorealistic super-resolution)
      - Real-ESRGAN (Perceptual GAN model for high-frequency textures)
      - Real-ESRGAN Anime 6B (Optimized for 2D illustrations, cartoons & clean vector lines)
      - Seamless padded tiling for massive images with zero seam boundary distortions
      - Batched multi-frame inference for video pipelines
    """
    def __init__(self, scale: int = 4, content_type: str = "photo", device: Optional[str] = None):
        self.scale = scale if scale in (2, 4) else 4
        self.content_type = content_type or "photo"
        self._target_device_str = device
        self._current_device = torch.device('cpu')
        self._is_loaded = False
        self._warmed_up = False

        self.name = f"Real-ESRGAN-{self.content_type.capitalize()}-{self.scale}x"
        self.capabilities = ["super_resolution", "denoise", "deblur", "artifact_removal"]
        self.supported_content_types = ["photo", "portrait", "landscape", "architecture", "anime", "illustration", "text"]

        is_anime_or_text = self.content_type in ["anime", "anime_text", "text", "cartoon", "illustration"]
        if is_anime_or_text:
            self.num_blocks = 6
            self.weights_url = REALESRGAN_ANIME_URL
            self.weights_path = REALESRGAN_ANIME_PATH
            self.cache_key = "anime_6b"
        elif self.content_type == "gan_aggressive":
            self.num_blocks = 23
            self.weights_url = REALESRGAN_X4_URL
            self.weights_path = REALESRGAN_X4_PATH
            self.cache_key = "photo_gan_x4"
        else:
            # Default to RealESRNet for natural, crisp, artifact-free photo restoration
            self.num_blocks = 23
            self.weights_url = REALESRNET_X4_URL
            self.weights_path = REALESRNET_X4_PATH
            self.cache_key = "photo_net_x4"

        download_weights(self.weights_url, self.weights_path)
        self.model: Optional[RRDBNet] = None
        self.load()

    def load(self, device: Optional[torch.device] = None) -> None:
        if self._is_loaded and self.model is not None:
            return

        global _WEIGHTS_CACHE
        if self.cache_key not in _WEIGHTS_CACHE:
            target_path = self.weights_path
            # Fallback if primary target not yet downloaded
            if not os.path.exists(target_path) or os.path.getsize(target_path) < 1_000_000:
                if os.path.exists(REALESRGAN_X4_PATH):
                    target_path = REALESRGAN_X4_PATH
                elif os.path.exists(REALESRNET_X4_PATH):
                    target_path = REALESRNET_X4_PATH

            if os.path.exists(target_path) and os.path.getsize(target_path) > 1_000_000:
                loadnet = torch.load(target_path, map_location='cpu', weights_only=True)
                if 'params_ema' in loadnet:
                    state_dict = loadnet['params_ema']
                elif 'params' in loadnet:
                    state_dict = loadnet['params']
                else:
                    state_dict = loadnet
                _WEIGHTS_CACHE[self.cache_key] = state_dict

        self.model = RRDBNet(num_in_ch=3, num_out_ch=3, scale=4, num_feat=64, num_block=self.num_blocks, num_grow_ch=32)
        if self.cache_key in _WEIGHTS_CACHE:
            self.model.load_state_dict(_WEIGHTS_CACHE[self.cache_key], strict=True)
        self.model.eval()

        self._ensure_device(device)
        self._is_loaded = True

        # Log device placement (omit noisy CPU warning during startup on ZeroGPU spaces)
        if torch.cuda.is_available():
            _log_gpu_diagnostics(f"Model '{self.name}' initialized on {self._current_device}")
        elif not HAS_SPACES:
            print(f"[Engine] Model '{self.name}' initialized on {self._current_device}", file=sys.stderr, flush=True)

    def warmup(self):
        """Run a single dummy forward pass to initialize CUDA kernels and cuDNN autotuner on active device."""
        if self._warmed_up or self.model is None:
            return
        try:
            active_dev = self._current_device
            dummy = torch.zeros(1, 3, 64, 64, device=active_dev)
            with torch.inference_mode():
                if active_dev.type == 'cuda':
                    with torch.amp.autocast('cuda', dtype=torch.float16):
                        _ = self.model(dummy)
                    torch.cuda.synchronize(active_dev)
                    gpu_name = torch.cuda.get_device_name(active_dev)
                    print(f"[ZeroGPU-CUDA] GPU Warmup complete on {active_dev} ({gpu_name})", file=sys.stderr, flush=True)
                else:
                    _ = self.model(dummy)
            self._warmed_up = True
        except Exception as e:
            print(f"[GPU] Warmup notice: {e}", file=sys.stderr, flush=True)

    def unload(self) -> None:
        if self.model is not None:
            del self.model
            self.model = None
        self._is_loaded = False
        self._warmed_up = False
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    def is_loaded(self) -> bool:
        return self._is_loaded and self.model is not None

    def _ensure_device(self, preferred_device: Optional[torch.device] = None) -> torch.device:
        if preferred_device:
            desired = preferred_device
        elif self._target_device_str:
            desired = torch.device(self._target_device_str)
        else:
            desired = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')

        if self._current_device != desired and self.model is not None:
            try:
                self.model = self.model.to(desired)
                self._current_device = desired
                self._warmed_up = False  # Trigger GPU warmup on new CUDA device
                if desired.type == 'cuda':
                    gpu_name = torch.cuda.get_device_name(desired)
                    print(f"[ZeroGPU-CUDA] Attached model to {desired} ({gpu_name})", file=sys.stderr, flush=True)
                    self.warmup()
            except Exception as e:
                print(f"[GPU] WARNING: Failed to move model to {desired}: {e}, falling back to CPU",
                      file=sys.stderr, flush=True)
                self.model = self.model.to('cpu')
                self._current_device = torch.device('cpu')

        return self._current_device

    def get_device_info(self) -> Dict[str, Any]:
        """Return truthful device placement information."""
        info = {
            "model_device": str(self._current_device),
            "cuda_available": torch.cuda.is_available(),
            "model_loaded": self._is_loaded,
            "warmed_up": self._warmed_up,
            "runtime_mode": get_runtime_mode(),
        }
        if torch.cuda.is_available():
            info["gpu_name"] = torch.cuda.get_device_name(0)
            info["vram_total_gb"] = round(torch.cuda.get_device_properties(0).total_mem / (1024**3), 2)
            info["vram_allocated_gb"] = round(torch.cuda.memory_allocated(0) / (1024**3), 2)
        return info

    def get_max_single_pass_size(self) -> int:
        """Determines max image dimension before tiling is required."""
        if self._current_device.type == 'cuda':
            try:
                free_bytes, _ = torch.cuda.mem_get_info()
                free_gb = free_bytes / (1024 ** 3)
                if free_gb >= 12.0:
                    return 2048
                elif free_gb >= 6.0:
                    return 1536
                elif free_gb >= 3.0:
                    return 1024
                else:
                    return 768
            except Exception:
                return 1024
        return 1024  # Modern CPUs can comfortably handle 1024x1024 without memory exhaustion

    @torch.inference_mode()
    def enhance(self, input_data: np.ndarray, **kwargs) -> np.ndarray:
        return self.enhance_image(input_data, **kwargs)

    @torch.inference_mode()
    def enhance_image(self, image_bgr: np.ndarray, **kwargs) -> np.ndarray:
        """
        Enhances an image with neural super-resolution.
        Preserves true resolution with seamless tiled processing when needed.
        Supports 2x and 4x scale with true CUDA/ZeroGPU execution.
        """
        if image_bgr is None:
            return image_bgr

        if not self._is_loaded or self.model is None:
            self.load()

        active_device = self._ensure_device()
        h, w = image_bgr.shape[:2]
        t_start = time.perf_counter()

        # Convert BGR uint8 -> RGB float32 tensor in range [0, 1]
        img_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

        max_dim = max(h, w)
        single_pass_threshold = self.get_max_single_pass_size()

        if max_dim <= single_pass_threshold:
            # Single pristine forward pass (zero tiling, zero seams)
            tensor = torch.from_numpy(img_rgb).permute(2, 0, 1).unsqueeze(0)
            tensor = tensor.to(active_device, non_blocking=True)
            if active_device.type == 'cuda':
                with torch.amp.autocast('cuda', dtype=torch.float16):
                    enhanced = self.model(tensor)
                torch.cuda.synchronize(active_device)
                vram_mb = torch.cuda.memory_allocated(active_device) / (1024 * 1024)
                gpu_name = torch.cuda.get_device_name(active_device)
                elapsed = time.perf_counter() - t_start
                print(f"[ZeroGPU-CUDA] Photo SR complete: GPU='{gpu_name}' ({active_device}) | Input: {w}x{h} -> {w*4}x{h*4} | VRAM: {vram_mb:.1f} MB | Time: {elapsed:.3f}s", file=sys.stderr, flush=True)
            else:
                enhanced = self.model(tensor)
            out_rgb = enhanced.squeeze(0).permute(1, 2, 0).float().cpu().numpy()
        else:
            # High-resolution multi-tile pass with edge-padded margin stripping
            out_rgb = self._process_tiles_seamless(img_rgb, active_device, tile_size=512, tile_pad=32)

        out_rgb = np.clip(out_rgb * 255.0, 0, 255).astype(np.uint8)
        out_bgr = cv2.cvtColor(out_rgb, cv2.COLOR_RGB2BGR)

        # Scale handling: RRDBNet natively produces 4x.
        if self.scale == 2:
            target_w = w * 2
            target_h = h * 2
            out_bgr = cv2.resize(out_bgr, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

        return out_bgr

    @torch.inference_mode()
    def enhance_batch(self, frames_bgr: List[np.ndarray]) -> List[np.ndarray]:
        """
        Batched inference for video frames on active CUDA device. Processes multiple frames
        in a single GPU forward pass for dramatically higher throughput.
        All frames must have the same (H, W) dimensions.
        Returns list of enhanced BGR frames.
        """
        if not frames_bgr:
            return []

        if not self._is_loaded or self.model is None:
            self.load()

        active_device = self._ensure_device()
        h, w = frames_bgr[0].shape[:2]
        max_dim = max(h, w)
        single_pass_threshold = self.get_max_single_pass_size()
        batch_count = len(frames_bgr)
        t_start = time.perf_counter()

        # If frames are too large for single-pass, fall back to per-frame tiled processing
        if max_dim > single_pass_threshold:
            return [self.enhance_image(f) for f in frames_bgr]

        # Convert all frames to RGB float32 tensors and stack into batch
        tensors = []
        for frame in frames_bgr:
            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
            t = torch.from_numpy(img_rgb).permute(2, 0, 1)  # (3, H, W)
            tensors.append(t)

        batch_tensor = torch.stack(tensors, dim=0)  # (B, 3, H, W)
        batch_tensor = batch_tensor.to(active_device, non_blocking=True)

        # Run batched forward pass
        try:
            if active_device.type == 'cuda':
                with torch.amp.autocast('cuda', dtype=torch.float16):
                    enhanced_batch = self.model(batch_tensor)
                torch.cuda.synchronize(active_device)
                vram_mb = torch.cuda.memory_allocated(active_device) / (1024 * 1024)
                gpu_name = torch.cuda.get_device_name(active_device)
                elapsed = time.perf_counter() - t_start
                batch_fps = batch_count / max(elapsed, 0.0001)
                print(f"[ZeroGPU-CUDA] Batch SR ({batch_count} frames): GPU='{gpu_name}' ({active_device}) | Frame: {w}x{h} -> {w*4}x{h*4} | VRAM: {vram_mb:.1f} MB | Batch FPS: {batch_fps:.2f}", file=sys.stderr, flush=True)
            else:
                enhanced_batch = self.model(batch_tensor)
        except RuntimeError as e:
            if "out of memory" in str(e).lower():
                # OOM: fall back to single-frame processing
                print(f"[GPU] OOM during batch inference (batch={batch_count}), falling back to single-frame processing", file=sys.stderr, flush=True)
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                return [self.enhance_image(f) for f in frames_bgr]
            raise


        # Convert back to list of BGR numpy arrays
        results = []
        enhanced_cpu = enhanced_batch.float().cpu()
        for i in range(enhanced_cpu.shape[0]):
            out_rgb = enhanced_cpu[i].permute(1, 2, 0).numpy()
            out_rgb = np.clip(out_rgb * 255.0, 0, 255).astype(np.uint8)
            out_bgr = cv2.cvtColor(out_rgb, cv2.COLOR_RGB2BGR)

            if self.scale == 2:
                target_w = w * 2
                target_h = h * 2
                out_bgr = cv2.resize(out_bgr, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

            results.append(out_bgr)

        return results

    @torch.inference_mode()
    def enhance_frame(self, frame_bgr: np.ndarray, detail_recovery: float = 0.0) -> np.ndarray:
        return self.enhance_image(frame_bgr)

    def _process_tiles_seamless(self, img_rgb: np.ndarray, active_device: torch.device, tile_size: int = 512, tile_pad: int = 32) -> np.ndarray:
        """
        Mathematically seamless tiled inference.
        Pads each tile by `tile_pad` pixels, runs inference, and strips the outer `tile_pad * scale` margin.
        Eliminates all boundary distortion, seam artifacts, and ghosting.
        """
        h, w, c = img_rgb.shape
        model_scale = 4  # RRDBNet native scale
        out_h, out_w = h * model_scale, w * model_scale
        out_img = np.zeros((out_h, out_w, c), dtype=np.float32)

        # Pad image border so edge tiles have valid padding
        padded_img = cv2.copyMakeBorder(img_rgb, tile_pad, tile_pad, tile_pad, tile_pad, cv2.BORDER_REFLECT_101)

        for y in range(0, h, tile_size):
            for x in range(0, w, tile_size):
                actual_tile_h = min(tile_size, h - y)
                actual_tile_w = min(tile_size, w - x)

                # Extract tile from padded_img with padding included
                py_start = y
                py_end = y + actual_tile_h + 2 * tile_pad
                px_start = x
                px_end = x + actual_tile_w + 2 * tile_pad

                tile_crop = padded_img[py_start:py_end, px_start:px_end]

                tile_tensor = torch.from_numpy(tile_crop).permute(2, 0, 1).unsqueeze(0)
                tile_tensor = tile_tensor.to(active_device, non_blocking=True)

                try:
                    if active_device.type == 'cuda':
                        with torch.amp.autocast('cuda', dtype=torch.float16):
                            enhanced_tile = self.model(tile_tensor).squeeze(0).permute(1, 2, 0).float().cpu().numpy()
                    else:
                        enhanced_tile = self.model(tile_tensor).squeeze(0).permute(1, 2, 0).float().cpu().numpy()
                except RuntimeError as e:
                    if "out of memory" in str(e).lower() and torch.cuda.is_available():
                        torch.cuda.empty_cache()
                        # Retry on CPU for this tile
                        tile_tensor_cpu = tile_tensor.cpu()
                        enhanced_tile = self.model.cpu()(tile_tensor_cpu).squeeze(0).permute(1, 2, 0).float().numpy()
                        self.model.to(active_device)
                    else:
                        raise

                # Strip padding margins from enhanced output
                valid_y_start = tile_pad * model_scale
                valid_y_end = valid_y_start + actual_tile_h * model_scale
                valid_x_start = tile_pad * model_scale
                valid_x_end = valid_x_start + actual_tile_w * model_scale

                valid_enhanced = enhanced_tile[valid_y_start:valid_y_end, valid_x_start:valid_x_end]

                out_y = y * model_scale
                out_x = x * model_scale
                out_img[out_y:out_y + actual_tile_h * model_scale, out_x:out_x + actual_tile_w * model_scale] = valid_enhanced

        return out_img


# Register models into ModelRegistry
registry.register("photo_x4", RealESRGANEngine(scale=4, content_type="photo"))
registry.register("photo_x2", RealESRGANEngine(scale=2, content_type="photo"))
registry.register("anime_x4", RealESRGANEngine(scale=4, content_type="anime"))
registry.register("anime_x2", RealESRGANEngine(scale=2, content_type="anime"))
