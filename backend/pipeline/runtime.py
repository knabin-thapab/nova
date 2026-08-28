import os
import sys

# Hugging Face ZeroGPU initialization - MUST BE IMPORTED FIRST BEFORE TORCH
try:
    import spaces
    HAS_SPACES = True
except ImportError:
    spaces = None
    HAS_SPACES = False


def zerogpu_gpu(duration: int = 60):
    """
    Dynamic Hugging Face ZeroGPU execution decorator.
    When running in a Hugging Face ZeroGPU space, wraps execution in spaces.GPU(duration=duration).
    On native CUDA or CPU environments, acts as a transparent passthrough.
    """
    if HAS_SPACES and hasattr(spaces, "GPU"):
        return spaces.GPU(duration=duration)
    return lambda fn: fn


def get_runtime_mode() -> str:
    """
    Returns explicit runtime mode:
      - 'zerogpu': Hugging Face ZeroGPU environment (dynamic RTX PRO 6000 allocation)
      - 'dedicated_gpu': Direct native CUDA environment
      - 'cpu': Local or CPU-only fallback environment
    """
    if HAS_SPACES and hasattr(spaces, "GPU"):
        return "zerogpu"
    import torch
    if torch.cuda.is_available():
        return "dedicated_gpu"
    return "cpu"
