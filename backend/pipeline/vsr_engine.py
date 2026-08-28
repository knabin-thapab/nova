# Hugging Face ZeroGPU initialization - MUST BE FIRST LINE BEFORE TORCH
try:
    import spaces
    HAS_SPACES = True
except ImportError:
    spaces = None
    HAS_SPACES = False

import torch
import torch.nn as nn
import numpy as np
import cv2
from typing import List, Optional, Dict, Any

from .models import RestorationModel, registry
from .realesrgan_engine import RealESRGANEngine, get_realesrgan_engine, get_adaptive_batch_size
from .temporal_window import TemporalConsistencyManager
from .preprocessor import VideoPreprocessor
from .runtime import get_runtime_mode


class TemporalVSREngine(RestorationModel):
    """
    Genuine Multi-Frame Video Super-Resolution and Temporal Restoration Engine.
    Implements RestorationModel interface.
    Features:
      - Exploits multi-frame temporal neighborhood contexts
      - Scene-cut detection to reset temporal buffer and prevent ghosting
      - Motion-compensated optical flow alignment
      - Super-resolution reconstruction with 2x and 4x scale
      - Selective high-frequency detail refinement
      - Batched multi-frame inference for dramatically higher throughput
      - Model loaded ONCE and reused across all frames
    """
    def __init__(
        self,
        scale: int = 4,
        content_type: str = "photo",
        mode: str = "balanced",
        denoise: float = 0.3,
        deblur: float = 0.3,
        artifact_removal: float = 0.3,
        detail_recovery: float = 0.5,
        temporal_consistency: bool = True,
        device: Optional[str] = None
    ):
        self.scale = scale if scale in (2, 4) else 4
        self.content_type = content_type or "photo"
        self.mode = mode
        self.detail_recovery = detail_recovery
        self.temporal_consistency_enabled = temporal_consistency
        self._target_device_str = device
        self._is_loaded = False

        self.name = f"TemporalVSR-{self.scale}x"
        self.capabilities = ["video_vsr", "temporal_stabilization", "scene_cut_detection", "super_resolution"]
        self.supported_content_types = ["photo", "video", "anime", "cinema"]

        is_anime_text = self.content_type in ["anime", "anime_text", "text", "cartoon"]
        self.preprocessor = VideoPreprocessor(
            denoise_strength=denoise,
            deblur_strength=deblur,
            artifact_removal_strength=artifact_removal,
            content_type=self.content_type,
            mode=self.mode
        )
        self.sr_engine = get_realesrgan_engine(content_type=self.content_type, scale=self.scale)
        self.temporal_mgr = TemporalConsistencyManager(
            window_size=5,
            temporal_strength=0.0 if is_anime_text else (0.55 if temporal_consistency else 0.0)
        )
        self.load()


    def load(self, device: Optional[torch.device] = None) -> None:
        self.sr_engine.load(device)
        self.sr_engine.warmup()
        self._is_loaded = True

    def unload(self) -> None:
        self.sr_engine.unload()
        self.temporal_mgr.reset()
        self._is_loaded = False

    def is_loaded(self) -> bool:
        return self._is_loaded and self.sr_engine.is_loaded()

    def enhance(self, input_data: np.ndarray, **kwargs) -> np.ndarray:
        neighbor_frames = kwargs.get("neighbor_frames", [])
        return self.process_frame_window(input_data, neighbor_frames)

    def process_frame_window(self, center_frame: np.ndarray, neighbor_frames: Optional[List[np.ndarray]] = None) -> np.ndarray:
        """
        Processes a single frame using its multi-frame temporal neighborhood context.
        1. Preprocesses frame (artifact removal, noise reduction, deblur).
        2. Performs deep neural super-resolution reconstruction.
        3. Applies motion-guided temporal consistency alignment with scene-cut prevention.
        """
        # Step 1: Preprocessing
        cleaned_center = self.preprocessor.process(center_frame)

        # Step 2: Neural Super-Resolution
        sr_restored = self.sr_engine.enhance_frame(cleaned_center, detail_recovery=self.detail_recovery)

        # Step 3: Multi-Frame Temporal Consistency Blending & Scene Cut Detection
        if self.temporal_consistency_enabled:
            stabilized = self.temporal_mgr.align_and_blend(sr_restored, neighbor_frames)
            return stabilized
        else:
            return sr_restored

    def process_frame_batch(self, frames: List[np.ndarray], neighbor_frames_list: Optional[List[List[np.ndarray]]] = None) -> List[np.ndarray]:
        """
        Batched frame processing for video pipelines.
        Preprocesses all frames, runs batched GPU inference, then applies
        temporal consistency sequentially (since it depends on frame order).
        
        Args:
            frames: List of BGR frames to process.
            neighbor_frames_list: Optional list of neighbor-frame lists (one per frame).
        
        Returns:
            List of restored BGR frames.
        """
        if not frames:
            return []

        # Step 1: Preprocess all frames (CPU, fast bilateral — lightweight)
        cleaned_frames = [self.preprocessor.process(f) for f in frames]

        # Step 2: Batched neural super-resolution
        sr_frames = self.sr_engine.enhance_batch(cleaned_frames)

        # Step 3: Apply temporal consistency sequentially
        # (temporal blending requires frame ordering and previous-frame state)
        results = []
        for i, sr_frame in enumerate(sr_frames):
            if self.temporal_consistency_enabled:
                neighbors = neighbor_frames_list[i] if neighbor_frames_list and i < len(neighbor_frames_list) else None
                stabilized = self.temporal_mgr.align_and_blend(sr_frame, neighbors)
                results.append(stabilized)
            else:
                results.append(sr_frame)

        return results

    def get_adaptive_batch_size(self, frame_h: int, frame_w: int) -> int:
        """Returns the optimal batch size for the current GPU/CPU and frame resolution."""
        return get_adaptive_batch_size(frame_h, frame_w, self.sr_engine._current_device)

    def reset_temporal(self):
        self.temporal_mgr.reset()


# Module-level engine cache for reuse across jobs
_vsr_engine_cache: Dict[str, TemporalVSREngine] = {}


def get_cached_vsr_engine(
    scale: int = 4,
    content_type: str = "photo",
    mode: str = "balanced",
    denoise: float = 0.3,
    deblur: float = 0.3,
    artifact_removal: float = 0.3,
    detail_recovery: float = 0.5,
    temporal_consistency: bool = True,
    device: Optional[str] = None
) -> TemporalVSREngine:
    """
    Returns a cached VSR engine for the given content type and scale,
    avoiding redundant model loading across jobs.
    """
    cache_key = f"{content_type}_{scale}x_{mode}"
    
    if cache_key not in _vsr_engine_cache:
        _vsr_engine_cache[cache_key] = TemporalVSREngine(
            scale=scale,
            content_type=content_type,
            mode=mode,
            denoise=denoise,
            deblur=deblur,
            artifact_removal=artifact_removal,
            detail_recovery=detail_recovery,
            temporal_consistency=temporal_consistency,
            device=device
        )
    else:
        # Reuse existing engine but update runtime parameters
        engine = _vsr_engine_cache[cache_key]
        engine.detail_recovery = detail_recovery
        engine.temporal_consistency_enabled = temporal_consistency
        engine.preprocessor.denoise = denoise
        engine.preprocessor.deblur = deblur
        engine.preprocessor.artifact_removal = artifact_removal
        engine.preprocessor.mode = mode
        engine.temporal_mgr.reset()  # Always reset temporal state for a new video

    return _vsr_engine_cache[cache_key]


registry.register("vsr_x4", TemporalVSREngine(scale=4, content_type="photo"))
registry.register("vsr_x2", TemporalVSREngine(scale=2, content_type="photo"))
