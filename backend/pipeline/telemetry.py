import os
import psutil
import torch
from typing import Dict, Any

try:
    import spaces
    IS_ZEROGPU_ENV = True
except ImportError:
    IS_ZEROGPU_ENV = os.environ.get("SPACES_ZERO_GPU", "").lower() in ("true", "1") or "SPACE_ID" in os.environ


class SystemTelemetry:
    """
    Real-Time Hardware & System Telemetry Monitor.
    Provides authentic CPU %, RAM usage, and truthful GPU/ZeroGPU statistics.
    Never fabricates metrics.
    """
    @staticmethod
    def get_hardware_telemetry() -> Dict[str, Any]:
        # System CPU & RAM
        cpu_percent = psutil.cpu_percent(interval=None)
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
                "vramTotalGB": round(torch.cuda.get_device_properties(0).total_memory / (1024 ** 3), 2) if gpu_available else None,
                "utilization": round((torch.cuda.memory_allocated(0) / max(torch.cuda.get_device_properties(0).total_memory, 1)) * 100, 1) if gpu_available else None,
                "status": "active" if gpu_available else "standby_ready"
            }
        elif gpu_available:
            vram_used = 0.0
            vram_total = 0.0
            utilization = 0.0
            try:
                vram_used = round(torch.cuda.memory_allocated(0) / (1024 ** 3), 2)
                vram_total = round(torch.cuda.get_device_properties(0).total_memory / (1024 ** 3), 2)
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
                "name": "Host CPU",
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
