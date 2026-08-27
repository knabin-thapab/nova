import asyncio
import os
import sys
import time

from pipeline.job_manager import RestorationJobManager

storage = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage")
jm = RestorationJobManager(storage)

source = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_error_404.mp4")
if not os.path.exists(source):
    source = os.path.join(storage, "uploads", "sample_error_404.mp4")

if not os.path.exists(source):
    print(f"Error: Benchmark sample video not found at {source}")
    sys.exit(1)

config = {
    "mode": "fast",
    "scale": 2,
    "denoise": 0.2,
    "deblur": 0.2,
    "artifactRemoval": 0.2,
    "detailRecovery": 0.4,
    "faceRestoration": False,
    "temporalConsistency": True,
    "outputFps": "source",
    "codec": "h264",
    "quality": 22,
    "bitDepth": 8
}

job_id = jm.create_job(source, config)
print(f"Created test job: {job_id}")
print(f"Source: {jm.get_job(job_id)['source']['width']}x{jm.get_job(job_id)['source']['height']} @ {jm.get_job(job_id)['source']['fps']} FPS, {jm.get_job(job_id)['source']['frameCount']} frames")
print(f"Target: {jm.get_job(job_id)['target']['width']}x{jm.get_job(job_id)['target']['height']} @ {jm.get_job(job_id)['target']['fps']} FPS")
print("=" * 60)

t_start = time.time()


def on_update(data):
    frame = data.get("currentFrame", 0)
    total = data.get("totalFrames", 0)
    status = data.get("status", "")
    stage = data.get("stage", "")
    progress = data.get("progress", 0)
    fps = data.get("fpsProcessing", 0)
    if frame % 25 == 0 or status in ["completed", "failed", "cancelled"]:
        elapsed = round(time.time() - t_start, 1)
        print(f"  [{status:>10}] {progress:6.1f}% | Frame {frame:>3}/{total} | {fps:.1f} fps | {elapsed}s | {stage}")


jm.register_callback(job_id, on_update)

print("Running pipeline...")
asyncio.run(jm.run_job(job_id))

job = jm.get_job(job_id)
total_time = round(time.time() - t_start, 1)
print("=" * 60)
print(f"Status:  {job['status']}")
print(f"Error:   {job.get('error')}")
print(f"Time:    {total_time}s")

if job.get("output"):
    o = job["output"]
    print(f"Output:  {o.get('width')}x{o.get('height')} @ {o.get('fps')} FPS, {o.get('frameCount')} frames")
    print(f"Codec:   {o.get('codec')}")
    print(f"Size:    {o.get('fileSize', 0) / 1024:.1f} KB")

output_path = job.get("outputPath", "")
if os.path.exists(output_path):
    print(f"File:    {output_path} ({os.path.getsize(output_path)} bytes)")
else:
    print(f"File:    NOT FOUND at {output_path}")

print("=" * 60)
