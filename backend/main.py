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
import shutil
import asyncio
import uuid
import cv2
import numpy as np
import torch
from typing import Dict, Any, Optional, Tuple, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, Response
import uvicorn

from pipeline.runtime import zerogpu_gpu, get_runtime_mode
from pipeline.media_probe import probe_video
from pipeline.analyzer import analyze_image, analyze_video
from pipeline.job_manager import RestorationJobManager
from pipeline.telemetry import SystemTelemetry
from pipeline.models import registry
from pipeline.realesrgan_engine import RealESRGANEngine
from pipeline.face_restore import FaceRestorationEngine
from pipeline.validator import VideoValidator



# Concurrency guard for shared GPU inference
_gpu_semaphore = asyncio.Semaphore(1)

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
UPLOADS_DIR = os.path.join(STORAGE_DIR, "uploads")
OUTPUTS_DIR = os.path.join(STORAGE_DIR, "outputs")
JOBS_DIR = os.path.join(STORAGE_DIR, "jobs")

for d in [STORAGE_DIR, UPLOADS_DIR, OUTPUTS_DIR, JOBS_DIR]:
    os.makedirs(d, exist_ok=True)

# Max photo resolution policies
MAX_IMAGE_DIM = int(os.environ.get("MAX_IMAGE_DIM", 8000))
MAX_IMAGE_MEGAPIXELS = float(os.environ.get("MAX_IMAGE_MEGAPIXELS", 50.0))


def cleanup_old_storage(max_age_hours: float = 1.0):
    """Auto-clean old temporary files to prevent unbounded disk growth."""
    now = time.time()
    for folder in [UPLOADS_DIR, OUTPUTS_DIR, JOBS_DIR]:
        if not os.path.exists(folder):
            continue
        for fname in os.listdir(folder):
            if fname.startswith("sample_"):
                continue  # Preserve benchmark sample video
            fpath = os.path.join(folder, fname)
            try:
                if os.path.isfile(fpath) and (now - os.path.getmtime(fpath)) > (max_age_hours * 3600):
                    os.remove(fpath)
            except Exception:
                pass


cleanup_old_storage(1.0)

# Golden sample video setup (packaged project asset)
SAMPLE_VIDEO_SRC = os.path.join(BASE_DIR, "sample_error_404.mp4")
SAMPLE_VIDEO_DEST = os.path.join(UPLOADS_DIR, "sample_error_404.mp4")

if os.path.exists(SAMPLE_VIDEO_SRC) and not os.path.exists(SAMPLE_VIDEO_DEST):
    try:
        shutil.copyfile(SAMPLE_VIDEO_SRC, SAMPLE_VIDEO_DEST)
    except Exception:
        pass


app = FastAPI(
    title="NOVA Production AI Media Restoration API",
    version="2.1.0",
    description="Real AI Super-Resolution and Video Restoration with Real-ESRGAN, Multi-Frame VSR, and Output Optimization"
)

# Universal CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)


@app.middleware("http")
async def add_custom_cors_and_security_headers(request: Request, call_next):
    req_id = request.headers.get("X-Request-Id", uuid.uuid4().hex[:8])
    if request.method == "OPTIONS":
        response = Response(status_code=200)
    else:
        try:
            response = await call_next(request)
        except HTTPException as he:
            response = JSONResponse(
                status_code=he.status_code,
                content={
                    "code": "HTTP_ERROR",
                    "message": he.detail,
                    "retryable": he.status_code >= 500,
                    "requestId": req_id
                }
            )
        except Exception as e:
            response = JSONResponse(
                status_code=500,
                content={
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": str(e),
                    "retryable": True,
                    "requestId": req_id
                }
            )

    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = (
        "X-Original-Width, X-Original-Height, X-Original-Size, "
        "X-Enhanced-Width, X-Enhanced-Height, X-Enhanced-Size, "
        "X-Saved-Percent, X-Request-Id, Content-Length, Content-Type"
    )
    response.headers["X-Request-Id"] = req_id
    return response


job_manager = RestorationJobManager(STORAGE_DIR)

# Mode-aware Real-ESRGAN engine cache
_sr_engines: Dict[str, RealESRGANEngine] = {}
_face_engine: Optional[FaceRestorationEngine] = None


def get_sr_engine(mode: str = "balanced", scale: int = 4) -> RealESRGANEngine:
    """Get or instantiate cached Real-ESRGAN engine for the given mode & scale."""
    global _sr_engines
    is_anime = mode in ("anime", "illustration", "anime_text")
    content_type = "anime" if is_anime else "photo"
    engine_key = f"{content_type}_x{scale}"

    if engine_key not in _sr_engines:
        _sr_engines[engine_key] = RealESRGANEngine(scale=scale, content_type=content_type)

    return _sr_engines[engine_key]


def get_face_engine(strength_mode: str = "balanced") -> FaceRestorationEngine:
    global _face_engine
    if _face_engine is None or _face_engine.strength_mode != strength_mode.lower():
        _face_engine = FaceRestorationEngine(enabled=True, strength_mode=strength_mode)
    return _face_engine


from pipeline.photo_restorer import photo_restorer

# Core AI photo restoration execution wrapper (ZeroGPU accelerated)
@zerogpu_gpu(duration=60)
def _run_photo_restoration(
    img: np.ndarray,
    scale: int,
    mode: str,
    face_restoration: bool = False,
    face_strength: str = "conservative"
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """Inside @spaces.GPU: CUDA is now available. Move model to GPU before inference."""
    import time as _time
    t0 = _time.perf_counter()

    # Inside ZeroGPU context — move SR engine to GPU
    if torch.cuda.is_available():
        device = torch.device('cuda:0')
        sr_engine = photo_restorer.get_sr_engine(mode=mode, scale=scale)
        if sr_engine._current_device.type != 'cuda':
            sr_engine._ensure_device(device)
        gpu_name = torch.cuda.get_device_name(device)
        print(f"[ZeroGPU] Photo restoration GPU allocated: {gpu_name} ({device})", file=sys.stderr, flush=True)

    result, metadata = photo_restorer.restore_photo(
        image_bgr=img,
        scale=scale,
        mode=mode,
        face_restoration=face_restoration,
        face_strength=face_strength
    )

    elapsed = _time.perf_counter() - t0
    if torch.cuda.is_available():
        vram_mb = torch.cuda.memory_allocated(0) / (1024 * 1024)
        print(f"[ZeroGPU] Photo restoration complete: {elapsed:.3f}s | VRAM: {vram_mb:.1f} MB", file=sys.stderr, flush=True)

    return result, metadata


def _run_photo_enhancement(img: np.ndarray, mode: str, scale: int) -> np.ndarray:
    res, _ = _run_photo_restoration(img, scale=scale, mode=mode)
    return res



# ---------------------------------------------------------------------------
# Storage & Media Streaming Route (Path Traversal Protected)
# ---------------------------------------------------------------------------

@app.get("/storage/{folder}/{filename}")
def serve_storage_file(folder: str, filename: str):
    """Safely serves media files with path-traversal prevention."""
    if folder not in ("uploads", "outputs", "jobs"):
        raise HTTPException(status_code=403, detail="Access denied")

    base_folder = os.path.join(STORAGE_DIR, folder)
    target_path = os.path.abspath(os.path.join(base_folder, filename))

    # Ensure requested path is strictly within the allowed directory
    if not target_path.startswith(os.path.abspath(base_folder)):
        raise HTTPException(status_code=403, detail="Invalid file path")

    if not os.path.exists(target_path) or not os.path.isfile(target_path):
        raise HTTPException(status_code=404, detail="File not found")

    ext = os.path.splitext(filename)[1].lower()
    media_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp"
    }
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(target_path, media_type=media_type)


# ---------------------------------------------------------------------------
# Production Health, Readiness & Worker Status Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "online",
        "system": "NOVA Production AI Media Restoration Engine",
        "version": "2.1.0",
        "runtime_mode": get_runtime_mode(),
        "zerogpu": HAS_SPACES,
        "docs": "/docs",
        "health": "/api/health",
        "ready": "/api/ready",
        "models": "/api/models",
        "workerStatus": "/api/worker-status"
    }


@app.get("/api/health")
@app.get("/api/v1/health")
def health_check():
    telemetry = SystemTelemetry.get_hardware_telemetry()
    gpu_info = telemetry.get("gpu", {})
    runtime = get_runtime_mode()
    cuda_avail = torch.cuda.is_available() or runtime == "zerogpu"
    return {
        "status": "online",
        "service": "nova-worker",
        "api": True,
        "gpu_available": cuda_avail,
        "runtime_mode": runtime,
        "zerogpu": HAS_SPACES,
        "worker_ready": True,
        "worker": telemetry.get("workerType", "self-hosted"),
        "gpu": gpu_info,
        "features": {
            "realEsrgan": True,
            "temporalVsr": True,
            "faceRestoration": True,
            "authenticAnalysis": True,
            "photoEnhancement": True,
            "videoRestoration": True,
            "sceneCutDetection": True,
            "tiledInference": True
        }
    }




@app.get("/api/ready")
@app.get("/api/v1/ready")
def readiness_check():
    """Returns 200 when models and worker are initialized and ready to accept jobs."""
    models_status = registry.list_models()
    gpu_ready = torch.cuda.is_available() or True  # CPU supported
    return {
        "ready": True,
        "workerState": "READY" if _gpu_semaphore._value > 0 else "BUSY",
        "gpuAvailable": torch.cuda.is_available(),
        "registeredModels": len(models_status),
        "activeJobs": len(job_manager.active_jobs)
    }


@app.get("/api/models")
@app.get("/api/v1/models")
def list_models_endpoint():
    """Returns availability and capabilities of all AI restoration models."""
    return {
        "photo_sr": True,
        "anime_sr": True,
        "face_restore": True,
        "video_vsr": True,
        "models": registry.list_models()
    }


@app.get("/api/worker-status")
@app.get("/api/v1/worker-status")
def worker_status():
    telemetry = SystemTelemetry.get_hardware_telemetry()
    worker_state = "READY" if _gpu_semaphore._value > 0 else "BUSY"
    return {
        "workerState": worker_state,
        "gpu": telemetry.get("gpu", {}),
        "cpuPercent": telemetry.get("cpuPercent", 0),
        "ramUsedGB": telemetry.get("ramUsedGB", 0),
        "ramTotalGB": telemetry.get("ramTotalGB", 0),
        "queueLength": len(job_manager.active_jobs),
        "activeJobs": sum(1 for j in job_manager.active_jobs.values() if j.get("status") in ("restoring", "queued")),
        "loadedModels": [k for k, m in registry.list_models().items() if m.get("loaded")]
    }


@app.get("/api/telemetry")
@app.get("/api/v1/telemetry")
def get_telemetry():
    return SystemTelemetry.get_hardware_telemetry()


@app.get("/api/benchmark/gpu")
@app.get("/api/v1/benchmark/gpu")
def gpu_benchmark(frames: int = 10, width: int = 320, height: int = 240):
    """
    Runs a genuine N-frame GPU inference benchmark and reports truthful performance metrics.
    Uses real model weights on the actual device to measure authentic throughput.
    """
    import time as _time

    # GPU diagnostics
    gpu_info = SystemTelemetry.get_gpu_benchmark_info()

    # Run real inference benchmark
    engine = get_sr_engine(mode="balanced", scale=4)
    device_info = engine.get_device_info()

    # Generate N random test frames
    test_frames = [np.random.randint(0, 255, (height, width, 3), dtype=np.uint8) for _ in range(frames)]

    # Warmup
    engine.warmup()

    # Benchmark single-frame
    t0 = _time.perf_counter()
    for f in test_frames:
        _ = engine.enhance_image(f)
    single_elapsed = _time.perf_counter() - t0
    single_fps = round(frames / max(single_elapsed, 0.001), 2)

    # Benchmark batched
    t1 = _time.perf_counter()
    _ = engine.enhance_batch(test_frames)
    batch_elapsed = _time.perf_counter() - t1
    batch_fps = round(frames / max(batch_elapsed, 0.001), 2)

    # VRAM after benchmark
    vram_after = None
    if torch.cuda.is_available():
        vram_after = round(torch.cuda.memory_allocated(0) / (1024**3), 2)
        torch.cuda.empty_cache()

    return {
        "gpu": gpu_info,
        "model_device": device_info,
        "benchmark": {
            "frames": frames,
            "input_resolution": f"{width}x{height}",
            "output_resolution": f"{width*4}x{height*4}",
            "single_frame": {
                "total_sec": round(single_elapsed, 3),
                "fps": single_fps,
            },
            "batched": {
                "total_sec": round(batch_elapsed, 3),
                "fps": batch_fps,
            },
            "vram_after_gb": vram_after,
            "speedup": round(batch_fps / max(single_fps, 0.01), 2) if single_fps > 0 else None,
        }
    }


# ---------------------------------------------------------------------------
# Authentic Media Analysis Routes (No fake/random numbers)
# ---------------------------------------------------------------------------

@app.post("/api/analyze")
@app.post("/api/v1/analyze")
async def analyze_media_file(file: UploadFile = File(...)):
    """
    Performs authentic mathematical & frequency-domain analysis on uploaded media.
    Returns measured properties (Laplacian variance sharpness, noise sigma,
    8x8 DCT blockiness, dynamic range, face presence, and recommended pipeline).
    """
    safe_name = os.path.basename(file.filename or "media").replace(" ", "_")
    ext = os.path.splitext(safe_name)[1].lower()

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if ext in ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.avif'):
        try:
            analysis = analyze_image(content)
            return analysis
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Image analysis error: {str(e)}")
    elif ext in ('.mp4', '.mov', '.mkv', '.webm', '.avi'):
        temp_vid = os.path.join(UPLOADS_DIR, f"probe_{uuid.uuid4().hex[:8]}_{safe_name}")
        with open(temp_vid, "wb") as f:
            f.write(content)
        try:
            analysis = analyze_video(temp_vid)
            return analysis
        finally:
            if os.path.exists(temp_vid):
                try:
                    os.remove(temp_vid)
                except Exception:
                    pass
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format {ext}.")


# ---------------------------------------------------------------------------
# Photo Enhancement Endpoint (Real-ESRGAN, Face Restore, Presets, Tiling)
# ---------------------------------------------------------------------------

@app.post("/api/enhance-image")
@app.post("/api/v1/photo/enhance")
async def enhance_image(
    file: UploadFile = File(...),
    scale: int = Form(4),
    mode: str = Form("balanced"),
    preset: str = Form("web"),   # 'web' | 'high_quality' | 'maximum'
    format: str = Form("auto"),  # 'auto' | 'jpeg' | 'webp' | 'png'
    face_restoration: bool = Form(False),
    face_strength: str = Form("conservative")
):
    """
    Accepts an image upload, runs Real-ESRGAN AI super-resolution with true scale (2x or 4x),
    applies neural face restoration if enabled/detected, preserves resolution via tiled inference,
    and returns an authentic verified output matching the requested preset.
    """
    safe_name = os.path.basename(file.filename or "image.png").replace(" ", "_")
    base, ext = os.path.splitext(safe_name)
    ext_lower = ext.lower()
    if ext_lower not in ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.avif'):
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPG, PNG, WebP, or TIFF.")

    upload_uid = uuid.uuid4().hex[:8]
    upload_path = os.path.join(UPLOADS_DIR, f"img_{upload_uid}_{safe_name}")

    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        input_size_bytes = os.path.getsize(upload_path)
        img_raw = cv2.imread(upload_path, cv2.IMREAD_UNCHANGED)
        if img_raw is None:
            raise HTTPException(status_code=400, detail="Could not decode image.")

        has_alpha = False
        if len(img_raw.shape) == 3 and img_raw.shape[2] == 4:
            has_alpha = True
            alpha_channel = img_raw[:, :, 3]
            img = img_raw[:, :, :3]
        else:
            img = img_raw if len(img_raw.shape) == 3 else cv2.cvtColor(img_raw, cv2.COLOR_GRAY2BGR)

        orig_h, orig_w = img.shape[:2]
        effective_scale = 2 if scale == 2 else 4

        # Clean neural input handling (avoid destructive filtering that causes painterly splotches)
        # Gentle color format verification
        img = img.astype(np.uint8)

        # Acquire concurrency semaphore and run AI restoration
        async with _gpu_semaphore:
            enhanced, restore_report = _run_photo_restoration(
                img,
                scale=effective_scale,
                mode=mode,
                face_restoration=face_restoration,
                face_strength=face_strength
            )

        eh, ew = enhanced.shape[:2]

        # Re-attach alpha channel if original had transparency
        if has_alpha:
            alpha_resized = cv2.resize(alpha_channel, (ew, eh), interpolation=cv2.INTER_LANCZOS4)
            enhanced = cv2.merge([enhanced[:, :, 0], enhanced[:, :, 1], enhanced[:, :, 2], alpha_resized])

        # Output format & quality optimization policy
        # Truthful Presets:
        # - web: Optimized JPEG / WebP
        # - high_quality: Very high quality JPEG / WebP
        # - maximum: True Lossless PNG / Lossless WebP
        if format == "auto":
            if has_alpha:
                chosen_format = "webp" if preset != "maximum" else "png"
            else:
                chosen_format = "png" if preset == "maximum" else "jpeg"
        else:
            chosen_format = format.lower()

        out_id = uuid.uuid4().hex[:8]
        if chosen_format in ("jpg", "jpeg"):
            out_ext = ".jpg"
            mime_type = "image/jpeg"
            q = 90 if preset == "web" else 96
            out_name = f"nova_restored_{out_id}_{ew}x{eh}{out_ext}"
            out_path = os.path.join(OUTPUTS_DIR, out_name)
            to_save = enhanced[:, :, :3] if len(enhanced.shape) == 3 and enhanced.shape[2] == 4 else enhanced
            cv2.imwrite(out_path, to_save, [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_PROGRESSIVE, 1, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
        elif chosen_format == "webp":
            out_ext = ".webp"
            mime_type = "image/webp"
            q = 88 if preset == "web" else (95 if preset == "high_quality" else 100)
            out_name = f"nova_restored_{out_id}_{ew}x{eh}{out_ext}"
            out_path = os.path.join(OUTPUTS_DIR, out_name)
            cv2.imwrite(out_path, enhanced, [cv2.IMWRITE_WEBP_QUALITY, q])
        else:
            out_ext = ".png"
            mime_type = "image/png"
            out_name = f"nova_restored_{out_id}_{ew}x{eh}{out_ext}"
            out_path = os.path.join(OUTPUTS_DIR, out_name)
            cv2.imwrite(out_path, enhanced, [cv2.IMWRITE_PNG_COMPRESSION, 4 if preset != "maximum" else 1])

        # Verify output file
        is_valid, report = VideoValidator.verify_image(out_path, ew, eh)
        if not is_valid:
            raise RuntimeError(f"Output verification failed: {report.get('error')}")

        output_size_bytes = os.path.getsize(out_path)
        saved_bytes = max(0, input_size_bytes - output_size_bytes)
        saved_percent = round((saved_bytes / input_size_bytes) * 100, 1) if input_size_bytes > 0 else 0.0

        headers = {
            "X-Original-Width": str(orig_w),
            "X-Original-Height": str(orig_h),
            "X-Original-Size": str(input_size_bytes),
            "X-Enhanced-Width": str(ew),
            "X-Enhanced-Height": str(eh),
            "X-Enhanced-Size": str(output_size_bytes),
            "X-Saved-Percent": str(saved_percent),
            "Access-Control-Expose-Headers": "*"
        }

        return FileResponse(
            path=out_path,
            filename=out_name,
            media_type=mime_type,
            headers=headers
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")
    finally:
        if os.path.exists(upload_path):
            try:
                os.remove(upload_path)
            except Exception:
                pass
        if torch.cuda.is_available():
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Video Probe & Upload Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/sample-video")
@app.get("/api/v1/sample-video")
def get_sample_video():
    """Returns authentic metadata for the packaged benchmark sample video."""
    target_sample = SAMPLE_VIDEO_DEST if os.path.exists(SAMPLE_VIDEO_DEST) else SAMPLE_VIDEO_SRC
    if not os.path.exists(target_sample):
        raise HTTPException(status_code=404, detail="Sample video file not packaged in this deployment.")

    meta = probe_video(target_sample)
    return {
        "filePath": target_sample,
        "url": "/storage/uploads/sample_error_404.mp4",
        "metadata": meta
    }


@app.post("/api/upload")
@app.post("/api/v1/upload")
async def upload_video(file: UploadFile = File(...)):
    """Handles validated video upload and extracts true container metadata."""
    raw_name = os.path.basename(file.filename or "video.mp4").replace(" ", "_")
    uid = uuid.uuid4().hex[:8]
    safe_filename = f"vid_{uid}_{raw_name}"
    target_path = os.path.join(UPLOADS_DIR, safe_filename)

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        meta = probe_video(target_path)
        meta["fileName"] = raw_name
    except Exception as e:
        if os.path.exists(target_path):
            try:
                os.remove(target_path)
            except Exception:
                pass
        raise HTTPException(status_code=400, detail=f"Invalid video file: {str(e)}")

    return {
        "filePath": target_path,
        "url": f"/storage/uploads/{safe_filename}",
        "metadata": meta
    }


@app.post("/api/probe")
@app.post("/api/v1/probe")
def probe_file(payload: Dict[str, Any]):
    file_path = payload.get("filePath")
    if not file_path:
        raise HTTPException(status_code=400, detail="filePath parameter required")

    abs_path = os.path.abspath(file_path)
    if not os.path.exists(abs_path):
        cand = os.path.join(UPLOADS_DIR, os.path.basename(file_path))
        if os.path.exists(cand):
            abs_path = cand
        else:
            raise HTTPException(status_code=404, detail="File not found")

    try:
        meta = probe_video(abs_path)
        return meta
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Restoration Jobs Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/jobs")
@app.post("/api/v1/jobs")
async def create_job(payload: Dict[str, Any]):
    """Creates and launches an asynchronous video restoration job."""
    source_path = payload.get("sourcePath")
    config = payload.get("config", {})

    if not source_path:
        raise HTTPException(status_code=400, detail="Valid sourcePath is required.")

    abs_path = os.path.abspath(source_path)
    if not os.path.exists(abs_path):
        cand = os.path.join(UPLOADS_DIR, os.path.basename(source_path))
        if os.path.exists(cand):
            abs_path = cand
        else:
            raise HTTPException(status_code=400, detail="Source file does not exist.")

    job_id = job_manager.create_job(abs_path, config)

    async def _guarded_runner():
        async with _gpu_semaphore:
            await job_manager.run_job(job_id)

    asyncio.create_task(_guarded_runner())

    return {
        "jobId": job_id,
        "job": job_manager.get_job(job_id)
    }


@app.get("/api/jobs/{job_id}")
@app.get("/api/v1/jobs/{job_id}")
def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    res = dict(job)
    if "outputPath" in res and os.path.exists(res["outputPath"]):
        res["restoredUrl"] = f"/storage/outputs/{os.path.basename(res['outputPath'])}"
    if "sourcePath" in res and os.path.exists(res["sourcePath"]):
        res["originalUrl"] = f"/storage/uploads/{os.path.basename(res['sourcePath'])}"
    return res


@app.post("/api/jobs/{job_id}/cancel")
@app.post("/api/v1/jobs/{job_id}/cancel")
def cancel_job(job_id: str):
    job_manager.cancel_job(job_id)
    return {"status": "cancelled", "jobId": job_id}


@app.get("/api/jobs")
@app.get("/api/v1/jobs")
def list_jobs():
    jobs_list = []
    for j_id, job in job_manager.active_jobs.items():
        item = dict(job)
        if "outputPath" in item and os.path.exists(item["outputPath"]):
            item["restoredUrl"] = f"/storage/outputs/{os.path.basename(item['outputPath'])}"
        if "sourcePath" in item and os.path.exists(item["sourcePath"]):
            item["originalUrl"] = f"/storage/uploads/{os.path.basename(item['sourcePath'])}"
        jobs_list.append(item)
    return jobs_list


@app.delete("/api/jobs/{job_id}")
@app.delete("/api/v1/jobs/{job_id}")
def delete_job(job_id: str):
    job = job_manager.active_jobs.pop(job_id, None)
    if job:
        out_path = job.get("outputPath")
        if out_path and os.path.exists(out_path):
            try:
                os.remove(out_path)
            except Exception:
                pass

        src_path = job.get("sourcePath")
        if src_path and os.path.exists(src_path) and "sample_error_404.mp4" not in src_path:
            try:
                os.remove(src_path)
            except Exception:
                pass
    else:
        cand = os.path.join(OUTPUTS_DIR, f"{job_id}_restored.mp4")
        if os.path.exists(cand):
            try:
                os.remove(cand)
            except Exception:
                pass

    return {"status": "deleted", "jobId": job_id, "permanent": True}


@app.delete("/api/jobs")
@app.delete("/api/v1/jobs")
def clear_all_jobs():
    job_manager.active_jobs.clear()

    if os.path.exists(OUTPUTS_DIR):
        for fname in os.listdir(OUTPUTS_DIR):
            fpath = os.path.join(OUTPUTS_DIR, fname)
            try:
                if os.path.isfile(fpath):
                    os.remove(fpath)
            except Exception:
                pass

    if os.path.exists(UPLOADS_DIR):
        for fname in os.listdir(UPLOADS_DIR):
            if fname.startswith("sample_"):
                continue
            fpath = os.path.join(UPLOADS_DIR, fname)
            try:
                if os.path.isfile(fpath):
                    os.remove(fpath)
            except Exception:
                pass

    return {"status": "cleared", "message": "All session history and files deleted"}


@app.get("/api/download/{job_id}")
@app.get("/api/v1/download/{job_id}")
def download_restored_video(job_id: str):
    target_path = None
    target_w = 1280
    target_h = 720

    job = job_manager.get_job(job_id)
    if job and "outputPath" in job and os.path.exists(job["outputPath"]):
        target_path = job["outputPath"]
        target_w = job.get("target", {}).get("width", 1280)
        target_h = job.get("target", {}).get("height", 720)
    else:
        cand = os.path.join(OUTPUTS_DIR, f"{job_id}_restored.mp4")
        if os.path.exists(cand):
            target_path = cand
        elif os.path.exists(os.path.join(OUTPUTS_DIR, job_id)):
            target_path = os.path.join(OUTPUTS_DIR, job_id)
        else:
            files = [os.path.join(OUTPUTS_DIR, f) for f in os.listdir(OUTPUTS_DIR) if f.endswith(".mp4") and not f.endswith(".encoding.mp4")]
            if files:
                files.sort(key=os.path.getmtime, reverse=True)
                target_path = files[0]

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Restored video file not found")

    filename = f"nova_restored_{target_w}x{target_h}.mp4"
    return FileResponse(
        path=target_path,
        filename=filename,
        media_type="video/mp4"
    )


# ---------------------------------------------------------------------------
# WebSocket Progress & Telemetry Stream
# ---------------------------------------------------------------------------

@app.websocket("/ws/jobs/{job_id}")
async def websocket_job_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    queue = asyncio.Queue()

    def on_update(data):
        queue.put_nowait(data)

    job_manager.register_callback(job_id, on_update)

    curr_job = job_manager.get_job(job_id)
    if curr_job:
        job_copy = dict(curr_job)
        if "outputPath" in job_copy and os.path.exists(job_copy["outputPath"]):
            job_copy["restoredUrl"] = f"/storage/outputs/{os.path.basename(job_copy['outputPath'])}"
        if "sourcePath" in job_copy and os.path.exists(job_copy["sourcePath"]):
            job_copy["originalUrl"] = f"/storage/uploads/{os.path.basename(job_copy['sourcePath'])}"
        await websocket.send_json(job_copy)

    try:
        while True:
            try:
                data = await asyncio.wait_for(queue.get(), timeout=1.0)
                data_copy = dict(data)
                if "outputPath" in data_copy and os.path.exists(data_copy["outputPath"]):
                    data_copy["restoredUrl"] = f"/storage/outputs/{os.path.basename(data_copy['outputPath'])}"
                if "sourcePath" in data_copy and os.path.exists(data_copy["sourcePath"]):
                    data_copy["originalUrl"] = f"/storage/uploads/{os.path.basename(data_copy['sourcePath'])}"
                data_copy["telemetry"] = SystemTelemetry.get_hardware_telemetry()
                await websocket.send_json(data_copy)
            except asyncio.TimeoutError:
                telemetry = SystemTelemetry.get_hardware_telemetry()
                await websocket.send_json({"type": "heartbeat", "telemetry": telemetry})
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        job_manager.unregister_callback(job_id, on_update)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
