#!/usr/bin/env python3
"""
NOVA Video Restoration Pipeline Benchmark
==========================================

Automated benchmark script that measures:
- Model loading time
- Single-frame inference time/FPS
- Batched inference time/FPS
- Preprocessing overhead
- Temporal consistency overhead
- Memory/VRAM usage
- End-to-end pipeline throughput

Usage:
    python benchmark_video_restoration.py
    python benchmark_video_restoration.py --video path/to/video.mp4
    python benchmark_video_restoration.py --frames 50 --width 640 --height 360
"""

import os
import sys
import time
import argparse
import numpy as np

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import torch


def print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def print_metric(label: str, value: str, indent: int = 2):
    print(f"{' '*indent}{label:<35} {value}")


def benchmark_gpu_diagnostics():
    """Print comprehensive GPU diagnostics."""
    print_header("GPU DIAGNOSTICS")
    print_metric("PyTorch Version", torch.__version__)
    print_metric("CUDA Available", str(torch.cuda.is_available()))
    print_metric("PyTorch CUDA Version", str(torch.version.cuda))
    print_metric("cuDNN Available", str(torch.backends.cudnn.is_available()))
    print_metric("cuDNN Benchmark", str(torch.backends.cudnn.benchmark))

    if torch.cuda.is_available():
        print_metric("Device Count", str(torch.cuda.device_count()))
        for i in range(torch.cuda.device_count()):
            total_vram = getattr(props, 'total_memory', getattr(props, 'total_mem', 0))
            gpu_name = getattr(props, 'name', torch.cuda.get_device_name(i))
            print_metric(f"GPU {i}", gpu_name)
            print_metric(f"  VRAM Total", f"{total_vram / (1024**3):.2f} GB")
            print_metric(f"  VRAM Allocated", f"{torch.cuda.memory_allocated(i) / (1024**3):.2f} GB")
            print_metric(f"  VRAM Reserved", f"{torch.cuda.memory_reserved(i) / (1024**3):.2f} GB")
            print_metric(f"  Compute Capability", f"{getattr(props, 'major', 0)}.{getattr(props, 'minor', 0)}")

    else:
        print_metric("STATUS", "WARNING: No CUDA GPU — CPU-only mode")


def benchmark_model_loading():
    """Benchmark model initialization time."""
    print_header("MODEL LOADING BENCHMARK")

    from pipeline.realesrgan_engine import RealESRGANEngine

    t0 = time.perf_counter()
    engine = RealESRGANEngine(scale=4, content_type="photo")
    t1 = time.perf_counter()

    print_metric("Model Load Time", f"{t1-t0:.3f}s")
    print_metric("Model Device", str(engine._current_device))
    print_metric("Model Loaded", str(engine.is_loaded()))

    # Warmup
    tw0 = time.perf_counter()
    engine.warmup()
    tw1 = time.perf_counter()
    print_metric("Warmup Time", f"{tw1-tw0:.3f}s")

    return engine


def benchmark_single_frame(engine, width: int, height: int, num_frames: int = 20):
    """Benchmark single-frame inference."""
    print_header(f"SINGLE-FRAME INFERENCE ({width}x{height}, {num_frames} frames)")

    frames = [np.random.randint(0, 255, (height, width, 3), dtype=np.uint8) for _ in range(num_frames)]

    times = []
    for i, f in enumerate(frames):
        t0 = time.perf_counter()
        _ = engine.enhance_image(f)
        t1 = time.perf_counter()
        times.append(t1 - t0)
        if (i + 1) % 5 == 0:
            print(f"    Frame {i+1}/{num_frames}: {t1-t0:.3f}s")

    total = sum(times)
    avg = total / len(times)
    fps = 1.0 / avg if avg > 0 else 0

    print_metric("Total Time", f"{total:.3f}s")
    print_metric("Avg Per Frame", f"{avg:.3f}s")
    print_metric("FPS", f"{fps:.2f}")
    print_metric("Min Frame Time", f"{min(times):.3f}s")
    print_metric("Max Frame Time", f"{max(times):.3f}s")

    return fps, avg


def benchmark_batched_inference(engine, width: int, height: int, num_frames: int = 20):
    """Benchmark batched inference."""
    print_header(f"BATCHED INFERENCE ({width}x{height}, {num_frames} frames)")

    from pipeline.realesrgan_engine import get_adaptive_batch_size
    batch_size = get_adaptive_batch_size(height, width, engine._current_device)
    print_metric("Adaptive Batch Size", str(batch_size))

    frames = [np.random.randint(0, 255, (height, width, 3), dtype=np.uint8) for _ in range(num_frames)]

    total_time = 0
    batches_processed = 0

    for start in range(0, num_frames, batch_size):
        batch = frames[start:start + batch_size]
        t0 = time.perf_counter()
        _ = engine.enhance_batch(batch)
        t1 = time.perf_counter()
        total_time += t1 - t0
        batches_processed += 1
        print(f"    Batch {batches_processed} ({len(batch)} frames): {t1-t0:.3f}s")

    fps = num_frames / total_time if total_time > 0 else 0

    print_metric("Total Time", f"{total_time:.3f}s")
    print_metric("FPS", f"{fps:.2f}")
    print_metric("Batches Processed", str(batches_processed))

    return fps, total_time


def benchmark_preprocessor(width: int, height: int, num_frames: int = 50):
    """Benchmark preprocessing speed."""
    print_header(f"PREPROCESSOR BENCHMARK ({width}x{height}, {num_frames} frames)")

    from pipeline.preprocessor import VideoPreprocessor

    frames = [np.random.randint(0, 255, (height, width, 3), dtype=np.uint8) for _ in range(num_frames)]

    for mode in ["fast", "balanced"]:
        pp = VideoPreprocessor(
            denoise_strength=0.3,
            deblur_strength=0.3,
            artifact_removal_strength=0.3,
            mode=mode
        )
        t0 = time.perf_counter()
        for f in frames:
            _ = pp.process(f)
        t1 = time.perf_counter()
        avg_ms = ((t1 - t0) / num_frames) * 1000
        print_metric(f"Mode '{mode}'", f"{avg_ms:.2f} ms/frame")


def benchmark_temporal(width: int, height: int, num_frames: int = 50):
    """Benchmark temporal consistency overhead."""
    print_header(f"TEMPORAL CONSISTENCY BENCHMARK ({width}x{height}, {num_frames} frames)")

    from pipeline.temporal_window import TemporalConsistencyManager

    frames = [np.random.randint(0, 255, (height, width, 3), dtype=np.uint8) for _ in range(num_frames)]
    mgr = TemporalConsistencyManager(window_size=5, temporal_strength=0.55)

    t0 = time.perf_counter()
    for f in frames:
        _ = mgr.align_and_blend(f)
    t1 = time.perf_counter()
    avg_ms = ((t1 - t0) / num_frames) * 1000
    print_metric("Avg Per Frame", f"{avg_ms:.2f} ms")
    print_metric("Total Time", f"{t1-t0:.3f}s")


def benchmark_video_file(video_path: str, max_frames: int = 30):
    """Benchmark against a real video file."""
    print_header(f"VIDEO FILE BENCHMARK: {os.path.basename(video_path)}")

    from pipeline.decoder import VideoDecoder
    from pipeline.media_probe import probe_video

    meta = probe_video(video_path)
    print_metric("Resolution", f"{meta['width']}x{meta['height']}")
    print_metric("FPS", str(meta['fps']))
    print_metric("Total Frames", str(meta['frameCount']))
    print_metric("Duration", f"{meta['duration']:.2f}s")

    decoder = VideoDecoder(video_path)
    frames = []
    for idx, ts, frame in decoder.stream_frames():
        frames.append(frame)
        if len(frames) >= max_frames:
            break
    decoder.close()

    print_metric("Frames Loaded", str(len(frames)))

    # Run through full VSR pipeline
    from pipeline.vsr_engine import TemporalVSREngine

    engine = TemporalVSREngine(scale=4, content_type="photo", mode="balanced")

    t0 = time.perf_counter()
    restored = engine.process_frame_batch(frames)
    t1 = time.perf_counter()

    fps = len(frames) / (t1 - t0) if (t1 - t0) > 0 else 0

    print_metric("Batched VSR Time", f"{t1-t0:.3f}s")
    print_metric("Batched VSR FPS", f"{fps:.2f}")
    print_metric("Output Resolution", f"{restored[0].shape[1]}x{restored[0].shape[0]}" if restored else "N/A")

    if torch.cuda.is_available():
        print_metric("VRAM After", f"{torch.cuda.memory_allocated(0) / (1024**3):.2f} GB")

    return fps


def main():
    parser = argparse.ArgumentParser(description="NOVA Video Restoration Pipeline Benchmark")
    parser.add_argument("--video", type=str, default=None, help="Path to a video file to benchmark")
    parser.add_argument("--frames", type=int, default=20, help="Number of synthetic frames to benchmark")
    parser.add_argument("--width", type=int, default=320, help="Test frame width")
    parser.add_argument("--height", type=int, default=240, help="Test frame height")
    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("  NOVA VIDEO RESTORATION PIPELINE BENCHMARK")
    print("=" * 60)

    # 1. GPU Diagnostics
    benchmark_gpu_diagnostics()

    # 2. Model Loading
    engine = benchmark_model_loading()

    # 3. Single-Frame Inference
    single_fps, single_avg = benchmark_single_frame(engine, args.width, args.height, args.frames)

    # 4. Batched Inference
    batch_fps, batch_total = benchmark_batched_inference(engine, args.width, args.height, args.frames)

    # 5. Preprocessor
    benchmark_preprocessor(args.width, args.height)

    # 6. Temporal Consistency
    # Use output resolution (4x) for temporal benchmark
    benchmark_temporal(args.width * 4, args.height * 4)

    # 7. Video file benchmark (if provided)
    video_fps = None
    if args.video and os.path.exists(args.video):
        video_fps = benchmark_video_file(args.video)
    elif os.path.exists(os.path.join("storage", "uploads", "sample_error_404.mp4")):
        video_fps = benchmark_video_file(os.path.join("storage", "uploads", "sample_error_404.mp4"))

    # Summary
    print_header("PERFORMANCE SUMMARY")
    print_metric("Single-Frame FPS", f"{single_fps:.2f}")
    print_metric("Batched FPS", f"{batch_fps:.2f}")
    if batch_fps > 0 and single_fps > 0:
        print_metric("Batch Speedup", f"{batch_fps/single_fps:.2f}x")
    if video_fps:
        print_metric("Video Pipeline FPS", f"{video_fps:.2f}")
    print_metric("Device", str(engine._current_device))

    if torch.cuda.is_available():
        print_metric("Final VRAM Used", f"{torch.cuda.memory_allocated(0) / (1024**3):.2f} GB")
        torch.cuda.empty_cache()

    print("\n" + "=" * 60)
    print("  BENCHMARK COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
