import os
import sys
import psutil
import torch
from typing import Dict, Any

try:
    import spaces
    IS_ZEROGPU_ENV = True
except ImportError:
    IS_ZEROGPU_ENV = os.environ.get("SPACES_ZERO_GPU", "").lower() in ("true", "1") or "SPACE_ID" in os.environ


def log_startup_gpu_diagnostics():
    """
    Emit comprehensive GPU diagnostics at server startup.
    Logs CUDA availability, device properties, VRAM, cuDNN, and PyTorch CUDA version.
    """
    print("=" * 60, file=sys.stderr, flush=True)
    print("[GPU DIAGNOSTICS] NOVA Server Startup", file=sys.stderr, flush=True)
    print(f"[GPU] CUDA available: {torch.cuda.is_available()}", file=sys.stderr, flush=True)
    print(f"[GPU] PyTorch version: {torch.__version__}", file=sys.stderr, flush=True)
    print(f"[GPU] PyTorch CUDA version: {torch.version.cuda}", file=sys.stderr, flush=True)
    print(f"[GPU] cuDNN available: {torch.backends.cudnn.is_available()}", file=sys.stderr, flush=True)

    if torch.cuda.is_available():
        print(f"[GPU] CUDA device count: {torch.cuda.device_count()}", file=sys.stderr, flush=True)
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            print(f"[GPU] Device {i}: {props.name}", file=sys.stderr, flush=True)
            print(f"[GPU]   VRAM total:     {props.total_mem / (1024**3):.2f} GB", file=sys.stderr, flush=True)
            print(f"[GPU]   VRAM allocated: {torch.cuda.memory_allocated(i) / (1024**3):.2f} GB", file=sys.stderr, flush=True)
            print(f"[GPU]   VRAM reserved:  {torch.cuda.memory_reserved(i) / (1024**3):.2f} GB", file=sys.stderr, flush=True)
            print(f"[GPU]   Compute capability: {props.major}.{props.minor}", file=sys.stderr, flush=True)
        print(f"[GPU] cuDNN benchmark: {torch.backends.cudnn.benchmark}", file=sys.stderr, flush=True)
        print(f"[GPU] Selected device: cuda:0", file=sys.stderr, flush=True)
    elif IS_ZEROGPU_ENV:
        print(f"[GPU] ZeroGPU environment detected — GPU allocated on-demand", file=sys.stderr, flush=True)
    else:
        print(f"[GPU] WARNING: No CUDA GPU detected!", file=sys.stderr, flush=True)
        print(f"[GPU] Running in CPU-only mode — video restoration will be SIGNIFICANTLY slower.",
              file=sys.stderr, flush=True)
        print(f"[GPU] To enable GPU acceleration, install PyTorch with CUDA support:", file=sys.stderr, flush=True)
        print(f"[GPU]   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121",
              file=sys.stderr, flush=True)

    print("=" * 60, file=sys.stderr, flush=True)


# Run diagnostics on module import (server startup)
log_startup_gpu_diagnostics()


class SystemTelemetry:
    """
    Real-Time Hardware & System Telemetry Monitor.
    Provides authentic CPU %, RAM usage, and truthful GPU/ZeroGPU statistics.
    Never fabricates metrics.
    """
    # Cache psutil CPU percent with a minimum interval to avoid 0% readings
    _last_cpu_percent: float = 0.0
    _last_cpu_time: float = 0.0

    @staticmethod
    def get_hardware_telemetry() -> Dict[str, Any]:
        # System CPU & RAM — use cached value if polled too rapidly
        now = psutil.cpu_times_percent.cache_clear if hasattr(psutil.cpu_times_percent, 'cache_clear') else None
        
        current_time = __import__('time').time()
        if current_time - SystemTelemetry._last_cpu_time >= 0.5:
            # Use interval=0.1 for a quick but non-zero measurement
            cpu_percent = psutil.cpu_percent(interval=0.1)
            SystemTelemetry._last_cpu_percent = cpu_percent
            SystemTelemetry._last_cpu_time = current_time
        else:
            cpu_percent = SystemTelemetry._last_cpu_percent

        ram = psutil.virtual_memory()
        ram_used_gb = round(ram.used / (1024 ** 3), 2)
        ram_total_gb = round(ram.total / (1024 ** 3), 2)
        ram_percent = ram.percent

        # True GPU / Compute Architecture State
        gpu_available = torch.cuda.is_available()

        if IS_ZEROGPU_ENV:
            gpu_info = {
                "available": True,
                "zeroGpu": True,
                "allocated": gpu_available,
                "device": "NVIDIA ZeroGPU (Dynamic Allocation)",
                "name": torch.cuda.get_device_name(0) if gpu_available else "Hugging Face ZeroGPU Pool (On-Demand)",
                "vramUsedGB": round(torch.cuda.memory_allocated(0) / (1024 ** 3), 2) if gpu_available else None,
                "vramTotalGB": round(torch.cuda.get_device_properties(0).total_mem / (1024 ** 3), 2) if gpu_available else None,
                "utilization": round((torch.cuda.memory_allocated(0) / max(torch.cuda.get_device_properties(0).total_mem, 1)) * 100, 1) if gpu_available else None,
                "status": "active" if gpu_available else "standby_ready"
            }
        elif gpu_available:
            vram_used = 0.0
            vram_total = 0.0
            utilization = 0.0
            try:
                vram_used = round(torch.cuda.memory_allocated(0) / (1024 ** 3), 2)
                vram_total = round(torch.cuda.get_device_properties(0).total_mem / (1024 ** 3), 2)
                utilization = round((vram_used / max(vram_total, 0.1)) * 100, 1)
            except Exception:
                pass

            gpu_info = {
                "available": True,
                "zeroGpu": False,
                "allocated": True,
                "device": "Dedicated CUDA GPU",
                "name": torch.cuda.get_device_name(0),
                "vramUsedGB": vram_used,
                "vramTotalGB": vram_total,
                "utilization": utilization,
                "status": "active"
            }
        else:
            gpu_info = {
                "available": False,
                "zeroGpu": False,
                "allocated": False,
                "device": "Host CPU / Multi-threading",
                "name": "Host CPU (No CUDA GPU)",
                "vramUsedGB": None,
                "vramTotalGB": None,
                "utilization": None,
                "status": "cpu_only"
            }

        return {
            "cpuPercent": cpu_percent,
            "ramUsedGB": ram_used_gb,
            "ramTotalGB": ram_total_gb,
            "ramPercent": ram_percent,
            "gpu": gpu_info,
            "threads": psutil.cpu_count(logical=True) or 4,
            "workerType": "huggingface-zerogpu" if IS_ZEROGPU_ENV else ("self-hosted-cuda" if gpu_available else "self-hosted-cpu")
        }

    @staticmethod
    def get_gpu_benchmark_info() -> Dict[str, Any]:
        """Returns detailed GPU information for benchmark diagnostics."""
        info = {
            "cuda_available": torch.cuda.is_available(),
            "pytorch_version": torch.__version__,
            "cuda_version": str(torch.version.cuda),
            "cudnn_available": torch.backends.cudnn.is_available(),
            "cudnn_benchmark": torch.backends.cudnn.benchmark,
        }
        if torch.cuda.is_available():
            props = torch.cuda.get_device_properties(0)
            info.update({
                "device_count": torch.cuda.device_count(),
                "gpu_name": props.name,
                "vram_total_gb": round(props.total_mem / (1024**3), 2),
                "vram_allocated_gb": round(torch.cuda.memory_allocated(0) / (1024**3), 2),
                "vram_reserved_gb": round(torch.cuda.memory_reserved(0) / (1024**3), 2),
                "compute_capability": f"{props.major}.{props.minor}",
            })
        return info
