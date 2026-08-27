import torch
import torch.nn as nn
import numpy as np
import cv2
from typing import List, Optional, Dict, Any

from .models import RestorationModel, registry
from .realesrgan_engine import RealESRGANEngine
from .temporal_window import TemporalConsistencyManager
from .preprocessor import VideoPreprocessor


class TemporalVSREngine(RestorationModel):
    """
    Genuine Multi-Frame Video Super-Resolution and Temporal Restoration Engine.
    Implements RestorationModel interface.
    Features:
      - Exploits multi-frame temporal neighborhood contexts
      - Scene-cut detection to reset temporal buffer and prevent ghosting
      - Motion-compensated optical flow alignment
      - Super-resolution reconstruction with 2x and 4x scale
      - Selective high-frequency detail refinement
    """
    def __init__(
        self,
        scale: int = 4,
        content_type: str = "photo",
        mode: str = "balanced",
        denoise: float = 0.3,
        deblur: float = 0.3,
        artifact_removal: float = 0.3,
        detail_recovery: float = 0.5,
        temporal_consistency: bool = True,
        device: Optional[str] = None
    ):
        self.scale = scale if scale in (2, 4) else 4
        self.content_type = content_type or "photo"
        self.mode = mode
        self.detail_recovery = detail_recovery
        self.temporal_consistency_enabled = temporal_consistency
        self._target_device_str = device
        self._is_loaded = False

        self.name = f"TemporalVSR-{self.scale}x"
        self.capabilities = ["video_vsr", "temporal_stabilization", "scene_cut_detection", "super_resolution"]
        self.supported_content_types = ["photo", "video", "anime", "cinema"]

        is_anime_text = self.content_type in ["anime", "anime_text", "text", "cartoon"]
        self.preprocessor = VideoPreprocessor(
            denoise_strength=denoise,
            deblur_strength=deblur,
            artifact_removal_strength=artifact_removal,
            content_type=self.content_type
        )
        self.sr_engine = RealESRGANEngine(scale=self.scale, content_type=self.content_type, device=device)
        self.temporal_mgr = TemporalConsistencyManager(
            window_size=5,
            temporal_strength=0.0 if is_anime_text else (0.55 if temporal_consistency else 0.0)
        )
        self.load()

    def load(self, device: Optional[torch.device] = None) -> None:
        self.sr_engine.load(device)
        self._is_loaded = True

    def unload(self) -> None:
        self.sr_engine.unload()
        self.temporal_mgr.reset()
        self._is_loaded = False

    def is_loaded(self) -> bool:
        return self._is_loaded and self.sr_engine.is_loaded()

    def enhance(self, input_data: np.ndarray, **kwargs) -> np.ndarray:
        neighbor_frames = kwargs.get("neighbor_frames", [])
        return self.process_frame_window(input_data, neighbor_frames)

    def process_frame_window(self, center_frame: np.ndarray, neighbor_frames: Optional[List[np.ndarray]] = None) -> np.ndarray:
        """
        Processes a single frame using its multi-frame temporal neighborhood context.
        1. Preprocesses frame (artifact removal, noise reduction, deblur).
        2. Performs deep neural super-resolution reconstruction.
        3. Applies motion-guided temporal consistency alignment with scene-cut prevention.
        """
        # Step 1: Preprocessing
        cleaned_center = self.preprocessor.process(center_frame)

        # Step 2: Neural Super-Resolution
        sr_restored = self.sr_engine.enhance_frame(cleaned_center, detail_recovery=self.detail_recovery)

        # Step 3: Multi-Frame Temporal Consistency Blending & Scene Cut Detection
        if self.temporal_consistency_enabled:
            stabilized = self.temporal_mgr.align_and_blend(sr_restored, neighbor_frames)
            return stabilized
        else:
            return sr_restored

    def reset_temporal(self):
        self.temporal_mgr.reset()


registry.register("vsr_x4", TemporalVSREngine(scale=4, content_type="photo"))
registry.register("vsr_x2", TemporalVSREngine(scale=2, content_type="photo"))
