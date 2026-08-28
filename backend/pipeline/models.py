# Hugging Face ZeroGPU initialization - MUST BE FIRST LINE BEFORE TORCH
try:
    import spaces
    HAS_SPACES = True
except ImportError:
    spaces = None
    HAS_SPACES = False

import os
import time
import abc
import torch
from typing import Dict, Any, Optional, List



class RestorationModel(abc.ABC):
    """
    Standard Model Adapter Interface for all NOVA AI restoration models.
    Supports dynamic lifecycle, memory tracking, device migration, and capability inspection.
    """
    name: str = "BaseModel"
    capabilities: List[str] = []
    supported_content_types: List[str] = ["photo"]
    scale: int = 4

    @abc.abstractmethod
    def load(self, device: Optional[torch.device] = None) -> None:
        """Loads weights and prepares model for inference."""
        pass

    @abc.abstractmethod
    def unload(self) -> None:
        """Unloads weights and frees memory."""
        pass

    @abc.abstractmethod
    def is_loaded(self) -> bool:
        """Returns True if model is loaded in memory."""
        pass

    @abc.abstractmethod
    def enhance(self, input_data: Any, **kwargs) -> Any:
        """Performs neural restoration inference."""
        pass


class ModelRegistry:
    """
    VRAM-Aware Model Registry and Lifecycle Manager.
    Tracks loaded models, monitors GPU VRAM availability, automatically evicts idle models
    when memory is constrained, and supports proactive model warmup.
    """
    _instance: Optional['ModelRegistry'] = None
    _models: Dict[str, RestorationModel] = {}
    _last_used: Dict[str, float] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelRegistry, cls).__new__(cls)
            cls._instance._models = {}
            cls._instance._last_used = {}
        return cls._instance

    def register(self, key: str, model: RestorationModel):
        self._models[key] = model
        self._last_used[key] = time.time()

    def get(self, key: str) -> Optional[RestorationModel]:
        model = self._models.get(key)
        if model is not None:
            self._last_used[key] = time.time()
        return model

    def list_models(self) -> Dict[str, Dict[str, Any]]:
        status = {}
        for key, model in self._models.items():
            status[key] = {
                "name": model.name,
                "loaded": model.is_loaded(),
                "capabilities": model.capabilities,
                "supportedContentTypes": model.supported_content_types,
                "scale": model.scale,
                "lastUsed": self._last_used.get(key, 0)
            }
        return status

    def check_vram_and_manage(self, min_free_mb: int = 1500):
        """Checks available VRAM and unloads least recently used models if memory is tight."""
        if not torch.cuda.is_available():
            return

        try:
            free_bytes, total_bytes = torch.cuda.mem_get_info()
            free_mb = free_bytes / (1024 * 1024)
            if free_mb < min_free_mb:
                sorted_models = sorted(self._last_used.items(), key=lambda x: x[1])
                for key, _ in sorted_models:
                    if free_mb >= min_free_mb:
                        break
                    model = self._models.get(key)
                    if model and model.is_loaded():
                        model.unload()
                        torch.cuda.empty_cache()
                        free_bytes, _ = torch.cuda.mem_get_info()
                        free_mb = free_bytes / (1024 * 1024)
        except Exception:
            pass

    def warmup_all(self):
        """Pre-warms registered models so first request is instant."""
        for key, model in self._models.items():
            try:
                model.load()
            except Exception as e:
                print(f"[!] Warmup failed for {key}: {e}", flush=True)


registry = ModelRegistry()
