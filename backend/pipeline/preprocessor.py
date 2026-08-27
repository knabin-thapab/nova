import cv2
import numpy as np


class VideoPreprocessor:
    """
    Video Preprocessor for Denoising, Deblurring, and Artifact Reduction with Text & Edge Preservation.
    """
    def __init__(
        self,
        denoise_strength: float = 0.0,
        deblur_strength: float = 0.0,
        artifact_removal_strength: float = 0.0,
        content_type: str = "photo"
    ):
        self.denoise = max(0.0, min(1.0, float(denoise_strength)))
        self.deblur = max(0.0, min(1.0, float(deblur_strength)))
        self.artifact_removal = max(0.0, min(1.0, float(artifact_removal_strength)))
        self.content_type = content_type or "photo"
        self.is_anime_text = self.content_type in ["anime", "anime_text", "text", "cartoon"]

    def process(self, frame: np.ndarray) -> np.ndarray:
        if frame is None:
            return frame

        out = frame.copy()

        # For text / anime graphics, protect sharp vector edges from smudging
        if self.is_anime_text:
            # 1. Light artifact cleanup preserving sharp line art
            if self.artifact_removal > 0.05:
                smoothed = cv2.bilateralFilter(out, d=3, sigmaColor=15, sigmaSpace=10)
                weight = self.artifact_removal * 0.4
                out = cv2.addWeighted(out, 1.0 - weight, smoothed, weight, 0)

            # 2. Text edge sharpening & deblurring
            if self.deblur > 0.05:
                gaussian = cv2.GaussianBlur(out, (0, 0), sigmaX=1.0)
                amount = 0.4 + self.deblur * 1.0
                sharpened = cv2.addWeighted(out, 1.0 + amount, gaussian, -amount, 0)
                out = np.clip(sharpened, 0, 255).astype(np.uint8)

            return out

        # Standard Photographic Preprocessing
        # 1. Artifact Removal (Deblocking & compression artifact smoothing)
        if self.artifact_removal > 0.05:
            sigma_color = int(15 + self.artifact_removal * 45)
            sigma_space = int(5 + self.artifact_removal * 15)
            smoothed = cv2.bilateralFilter(out, d=5, sigmaColor=sigma_color, sigmaSpace=sigma_space)
            weight = self.artifact_removal * 0.8
            out = cv2.addWeighted(out, 1.0 - weight, smoothed, weight, 0)

        # 2. Denoising
        if self.denoise > 0.05:
            h_val = float(3.0 + self.denoise * 12.0)
            if out.shape[0] * out.shape[1] <= 640 * 480:
                denoised = cv2.fastNlMeansDenoisingColored(out, None, h_val, h_val, 7, 15)
            else:
                denoised = cv2.bilateralFilter(out, d=7, sigmaColor=h_val * 5, sigmaSpace=h_val * 3)
            weight = self.denoise
            out = cv2.addWeighted(out, 1.0 - weight, denoised, weight, 0)

        # 3. Deblurring (Unsharp masking / high-frequency boost)
        if self.deblur > 0.05:
            gaussian = cv2.GaussianBlur(out, (0, 0), sigmaX=1.5 + self.deblur * 2.0)
            amount = 0.5 + self.deblur * 1.5
            sharpened = cv2.addWeighted(out, 1.0 + amount, gaussian, -amount, 0)
            out = np.clip(sharpened, 0, 255).astype(np.uint8)

        return out
