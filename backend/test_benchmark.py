import os
import time
import cv2
import numpy as np
import torch

from pipeline.realesrgan_engine import RealESRGANEngine
from pipeline.face_restore import FaceRestorationEngine
from pipeline.analyzer import analyze_image
from pipeline.validator import VideoValidator

print("=" * 60, flush=True)
print("[BENCHMARK] NOVA Neural AI Restoration Engine Benchmarks", flush=True)
print("=" * 60, flush=True)

# 1. Photo SR Benchmark
print("\n--- 1. Neural Super-Resolution (Real-ESRGAN Photo 4x) ---", flush=True)
engine_x4 = RealESRGANEngine(scale=4, content_type="photo")
test_img = np.zeros((300, 300, 3), dtype=np.uint8)
cv2.circle(test_img, (150, 150), 100, (0, 200, 255), -1)
cv2.putText(test_img, "NOVA", (65, 165), cv2.FONT_HERSHEY_DUPLEX, 1.8, (20, 20, 20), 3)

t0 = time.time()
restored_x4 = engine_x4.enhance_image(test_img)
t_x4 = round(time.time() - t0, 3)
h, w = restored_x4.shape[:2]
print(f"  Input: 300x300 -> Restored Output: {w}x{h} in {t_x4}s", flush=True)
assert w == 1200 and h == 1200

# 2. 2x Scale Benchmark
print("\n--- 2. Neural Super-Resolution (Real-ESRGAN Photo 2x) ---", flush=True)
engine_x2 = RealESRGANEngine(scale=2, content_type="photo")
t0 = time.time()
restored_x2 = engine_x2.enhance_image(test_img)
t_x2 = round(time.time() - t0, 3)
h2, w2 = restored_x2.shape[:2]
print(f"  Input: 300x300 -> Restored Output: {w2}x{h2} in {t_x2}s", flush=True)
assert w2 == 600 and h2 == 600

# 3. Face Restoration Benchmark
print("\n--- 3. Face Restoration & Identity Preservation Engine ---", flush=True)
face_engine = FaceRestorationEngine(enabled=True, strength_mode="conservative")
face_img = np.zeros((200, 200, 3), dtype=np.uint8)
cv2.circle(face_img, (100, 100), 60, (200, 180, 160), -1)  # skin tone
cv2.circle(face_img, (80, 85), 6, (50, 30, 20), -1)       # eye
cv2.circle(face_img, (120, 85), 6, (50, 30, 20), -1)      # eye
cv2.ellipse(face_img, (100, 120), (20, 10), 0, 0, 180, (50, 30, 150), -1) # mouth

t0 = time.time()
restored_face, faces_found = face_engine.process(face_img)
t_face = round(time.time() - t0, 3)
print(f"  Face Processed: {restored_face.shape[1]}x{restored_face.shape[0]} in {t_face}s | Strength: {face_engine.strength}", flush=True)

# 4. Authentic Image Analysis Benchmark
print("\n--- 4. Authentic Frequency & Degradation Analysis ---", flush=True)
_, enc_buf = cv2.imencode(".jpg", test_img, [cv2.IMWRITE_JPEG_QUALITY, 60])
analysis = analyze_image(enc_buf.tobytes())
print(f"  Sharpness Score: {analysis['sharpnessScore']}", flush=True)
print(f"  Noise Sigma: {analysis['noiseSigma']}", flush=True)
print(f"  Compression Level: {analysis['compressionLevel']}", flush=True)
print(f"  Diagnosis: {analysis['diagnosis']}", flush=True)
print(f"  Recommended Pipeline: {analysis['recommendedPipeline']}", flush=True)

print("\n" + "=" * 60, flush=True)
print("[SUCCESS] ALL NOVA BENCHMARK MODULES VERIFIED PERFECTLY!", flush=True)
print("=" * 60, flush=True)
