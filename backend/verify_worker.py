import os
import sys
import io
import time
import cv2
import numpy as np
from fastapi.testclient import TestClient

from main import app as fastapi_app
from pipeline.validator import VideoValidator

client = TestClient(fastapi_app)

print("=" * 60)
print("[TEST] Running Full NOVA AI Production Engine Verification...")
print("=" * 60)

# 1. Health & Telemetry checks
print("[1/9] Testing /api/health and /api/v1/health...")
res_h1 = client.get("/api/health")
assert res_h1.status_code == 200, f"Health check failed: {res_h1.text}"
data_h1 = res_h1.json()
print("  Status:", data_h1.get("status"))
print("  Worker:", data_h1.get("worker"))
print("  GPU Device:", data_h1.get("gpu", {}).get("device"))
print("  Features:", data_h1.get("features"))
assert data_h1.get("status") == "online"
assert data_h1.get("features", {}).get("realEsrgan") is True
assert data_h1.get("features", {}).get("faceRestoration") is True
print("  [PASS] Health endpoints verified.")

# 2. Readiness Endpoint
print("\n[2/9] Testing /api/ready and /api/v1/ready...")
res_r = client.get("/api/ready")
assert res_r.status_code == 200, f"Ready check failed: {res_r.text}"
r_data = res_r.json()
print(f"  Worker State: {r_data.get('workerState')} | Registered Models: {r_data.get('registeredModels')}")
assert r_data.get("ready") is True
print("  [PASS] Worker readiness verified.")

# 3. Models Endpoint
print("\n[3/9] Testing /api/models...")
res_m = client.get("/api/models")
assert res_m.status_code == 200, f"Models check failed: {res_m.text}"
m_data = res_m.json()
print("  Available Model Capabilities:")
print("  - Photo SR:", m_data.get("photo_sr"))
print("  - Face Restore:", m_data.get("face_restore"))
print("  - Video VSR:", m_data.get("video_vsr"))
assert m_data.get("photo_sr") is True
assert m_data.get("face_restore") is True
print("  [PASS] Model registry verified.")

# 4. Worker Status
print("\n[4/9] Testing /api/worker-status...")
res_ws = client.get("/api/worker-status")
assert res_ws.status_code == 200
ws_data = res_ws.json()
print(f"  Worker State: {ws_data.get('workerState')} | Active Jobs: {ws_data.get('activeJobs')} | CPU: {ws_data.get('cpuPercent')}%")
print("  [PASS] Worker status verified.")

# 5. Image Analysis with Content Classification & Diagnosis
print("\n[5/9] Testing /api/analyze (Authentic degradation analysis & diagnosis)...")
test_img = np.zeros((240, 240, 3), dtype=np.uint8)
cv2.putText(test_img, "NOVA AI PROD", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
_, buf = cv2.imencode(".jpg", test_img)

res_an = client.post(
    "/api/analyze",
    files={"file": ("test.jpg", io.BytesIO(buf.tobytes()), "image/jpeg")}
)
assert res_an.status_code == 200, f"Analysis failed: {res_an.text}"
an_data = res_an.json()
print(f"  Dimensions: {an_data.get('width')}x{an_data.get('height')}")
print(f"  Content Class: {an_data.get('contentClass')}")
print(f"  Sharpness Score: {an_data.get('sharpnessScore')} / 100")
print(f"  Compression Level: {an_data.get('compressionLevel')}")
print(f"  Diagnosis: {an_data.get('diagnosis')}")
print(f"  Recommended Pipeline: {an_data.get('recommendedPipeline')}")
assert "sharpnessScore" in an_data
assert "diagnosis" in an_data
assert "recommendedPipeline" in an_data
print("  [PASS] Media analysis & classification verified.")

# 6. Real AI Photo Enhancement (4x, 2x, presets, tiled inference)
print("\n[6/9] Testing /api/enhance-image (4x Scale, Maximum Preset)...")
t0 = time.time()
res_enh4 = client.post(
    "/api/enhance-image",
    data={"scale": 4, "mode": "balanced", "preset": "maximum", "format": "auto"},
    files={"file": ("test.jpg", io.BytesIO(buf.tobytes()), "image/jpeg")}
)
assert res_enh4.status_code == 200, f"Enhance 4x failed: {res_enh4.text}"
enh4_w = int(res_enh4.headers.get("X-Enhanced-Width", 0))
enh4_h = int(res_enh4.headers.get("X-Enhanced-Height", 0))
print(f"  4x Output: {enh4_w}x{enh4_h} in {round(time.time()-t0, 2)}s | MIME: {res_enh4.headers.get('content-type')}")
assert enh4_w == 240 * 4 and enh4_h == 240 * 4
assert res_enh4.headers.get("content-type") == "image/png"  # Maximum preset gives PNG

print("\nTesting /api/enhance-image (2x Scale, Web Preset)...")
t1 = time.time()
res_enh2 = client.post(
    "/api/enhance-image",
    data={"scale": 2, "mode": "balanced", "preset": "web", "format": "jpeg", "face_restoration": True},
    files={"file": ("test.jpg", io.BytesIO(buf.tobytes()), "image/jpeg")}
)
assert res_enh2.status_code == 200, f"Enhance 2x failed: {res_enh2.text}"
enh2_w = int(res_enh2.headers.get("X-Enhanced-Width", 0))
enh2_h = int(res_enh2.headers.get("X-Enhanced-Height", 0))
print(f"  2x Output: {enh2_w}x{enh2_h} in {round(time.time()-t1, 2)}s | MIME: {res_enh2.headers.get('content-type')}")
assert enh2_w == 240 * 2 and enh2_h == 240 * 2
assert res_enh2.headers.get("content-type") == "image/jpeg"
print("  [PASS] Neural super-resolution and presets verified.")

# 7. Video Probe Endpoint
print("\n[7/9] Testing /api/sample-video...")
res_samp = client.get("/api/sample-video")
assert res_samp.status_code == 200, f"Sample video probe failed: {res_samp.text}"
samp_meta = res_samp.json().get("metadata", {})
print(f"  Sample: {samp_meta.get('width')}x{samp_meta.get('height')} @ {samp_meta.get('fps')} FPS, {samp_meta.get('frameCount')} frames")
print("  [PASS] Video probe verified.")

# 8. Video Job Lifecycle
print("\n[8/9] Testing Video Job Creation & Status...")
res_job = client.post(
    "/api/jobs",
    json={
        "sourcePath": res_samp.json().get("filePath"),
        "config": {"scale": 2, "mode": "fast", "faceRestoration": False}
    }
)
assert res_job.status_code == 200, f"Job creation failed: {res_job.text}"
job_id = res_job.json().get("jobId")
print(f"  Created job: {job_id}")

res_status = client.get(f"/api/jobs/{job_id}")
assert res_status.status_code == 200
print(f"  Job status: {res_status.json().get('status')}")

res_cancel = client.post(f"/api/jobs/{job_id}/cancel")
assert res_cancel.status_code == 200
print(f"  Job cancel status: {res_cancel.json().get('status')}")
print("  [PASS] Job lifecycle verified.")

# 9. Security: Path Traversal Protection
print("\n[9/9] Testing Path Traversal Protection on Storage...")
res_sec = client.get("/storage/uploads/../../main.py")
assert res_sec.status_code in (403, 404), f"Security vulnerability: traversal allowed with status {res_sec.status_code}"
print("  [PASS] Path traversal protection verified.")

print("\n" + "=" * 60)
print("[SUCCESS] ALL 9 NOVA PRODUCTION ENGINE TEST SUITES PASSED!")
print("=" * 60)
