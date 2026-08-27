---
title: NOVA AI Worker
emoji: ⚡
colorFrom: indigo
colorTo: purple
sdk: gradio
app_file: app.py
pinned: false
license: apache-2.0
short_description: NOVA hosted AI worker for photo enhancement and video restoration
---

# ⚡ NOVA — AI Photo Enhancement & Video Super-Resolution Worker

Production PyTorch & Real-ESRGAN backend worker for the NOVA Media Restoration platform. Supports dynamic Hugging Face ZeroGPU acceleration and standalone server deployment.

### 🚀 Key Capabilities
- **Real-ESRGAN Super-Resolution:** 4x deep neural upscaling for photographs and illustrations.
- **Dynamic ZeroGPU Allocation:** On-demand GPU resource management via `@spaces.GPU`.
- **Temporal Video VSR:** Multi-frame motion-consistent video restoration.
- **Safe Output Optimization:** Automatic progressive JPEG / WebP encoding and resolution guards.
- **Hardware Telemetry:** Authentic hardware utilization metrics (no simulated data).

### 📡 API Reference
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health & worker status |
| `GET` | `/api/telemetry` | Authentic hardware telemetry |
| `POST` | `/api/analyze` | Measured sharpness, noise, and blockiness metrics |
| `POST` | `/api/enhance-image` | High-speed AI photo super-resolution |
| `POST` | `/api/upload` | Media container probe & upload |
| `POST` | `/api/jobs` | Launch asynchronous temporal video restoration |
| `GET` | `/api/jobs/{job_id}` | Real-time job progress & metadata |
| `GET` | `/api/download/{job_id}` | Secure download of restored media |
| `WS` | `/ws/jobs/{job_id}` | Live WebSocket frame progress & preview stream |
| `GET` | `/docs` | Interactive OpenAPI Swagger UI |
