# NOVA AI Media Restoration Architecture

NOVA is a production-grade AI photo super-resolution and temporal video restoration platform.

## Architecture
- **Frontend**: React 18 + Vite + TailwindCSS (`frontend/`)
- **Backend**: FastAPI + PyTorch + Real-ESRGAN / Real-ESRNet + ZeroGPU/CUDA (`backend/`)
- **Inference Engines**:
  - `RealESRNet_x4plus`: Photorealistic, clean, natural super-resolution with zero GAN artifacts
  - `RealESRGAN_x4plus`: High-frequency perceptual super-resolution
  - `RealESRGAN_x4plus_anime_6B`: 2D illustrations & anime super-resolution
  - `FaceRestorationEngine`: Identity-preserving facial feature restoration
  - `VideoVSR`: Multi-frame temporal video restoration with scene-cut detection
