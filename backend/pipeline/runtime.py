import os
import sys

# Hugging Face ZeroGPU initialization - MUST BE IMPORTED FIRST BEFORE TORCH
try:
    import spaces
    HAS_SPACES = True
except ImportError:
    HAS_SPACES = False
    # Register shim so @spaces.GPU works in local dev / CPU environments without errors
    class _SpacesShim:
        @staticmethod
        def GPU(duration=60):
            def decorator(fn):
                return fn
            return decorator
    spaces = _SpacesShim()
    sys.modules['spaces'] = spaces


def zerogpu_gpu(duration: int = 60):
    return spaces.GPU(duration=duration)


def get_runtime_mode() -> str:

    """
    Returns explicit runtime mode:
      - 'zerogpu': Hugging Face ZeroGPU environment (dynamic RTX PRO 6000 allocation)
      - 'dedicated_gpu': Direct native CUDA environment
      - 'cpu': Local or CPU-only fallback environment
    """
    if HAS_SPACES:
        return "zerogpu"
    import torch
    if torch.cuda.is_available():
        return "dedicated_gpu"
    return "cpu"

