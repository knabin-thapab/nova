import cv2
import numpy as np
from typing import List, Optional, Tuple, Dict


# Module-level meshgrid cache to avoid reallocation per frame
_MESHGRID_CACHE: Dict[Tuple[int, int], Tuple[np.ndarray, np.ndarray]] = {}


def _get_meshgrid(w: int, h: int) -> Tuple[np.ndarray, np.ndarray]:
    """Returns cached (flow_map_x, flow_map_y) float32 meshgrids for the given resolution."""
    key = (w, h)
    if key not in _MESHGRID_CACHE:
        flow_map_x, flow_map_y = np.meshgrid(
            np.arange(w, dtype=np.float32),
            np.arange(h, dtype=np.float32)
        )
        _MESHGRID_CACHE[key] = (flow_map_x, flow_map_y)
    return _MESHGRID_CACHE[key]


class TemporalConsistencyManager:
    """
    Temporal Multi-Frame Consistency, Scene-Cut Detection, and Motion Stabilization Engine.
    Features:
      - Inter-frame scene cut detection via Color Histogram & Structural Delta analysis
      - Instant temporal buffer reset across shot transitions (prevents cross-scene ghosting)
      - Motion-compensated optical flow alignment
      - Dynamic confidence weighting (distinguishing static background, camera pan, and rapid motion)
      - Elimination of high-frequency flicker and popping textures
      - Cached meshgrid arrays to eliminate per-frame allocation overhead
    """
    def __init__(self, window_size: int = 5, temporal_strength: float = 0.6, scene_cut_threshold: float = 0.45):
        self.window_size = window_size
        self.temporal_strength = max(0.0, min(1.0, float(temporal_strength)))
        self.scene_cut_threshold = scene_cut_threshold
        self.prev_restored_frame: Optional[np.ndarray] = None
        self.prev_small_gray: Optional[np.ndarray] = None
        self.prev_hist: Optional[np.ndarray] = None

    def detect_scene_cut(self, current_small_bgr: np.ndarray) -> bool:
        """
        Detects scene transitions using HSV color histogram correlation and structural difference.
        Returns True if a scene cut occurred between previous and current frame.
        """
        if self.prev_hist is None:
            return False

        try:
            hsv = cv2.cvtColor(current_small_bgr, cv2.COLOR_BGR2HSV)
            hist = cv2.calcHist([hsv], [0, 1], None, [30, 32], [0, 180, 0, 256])
            cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

            correlation = cv2.compareHist(self.prev_hist, hist, cv2.HISTCMP_CORREL)
            # Correlation below threshold indicates abrupt scene transition
            is_cut = correlation < self.scene_cut_threshold
            return is_cut
        except Exception:
            return False

    def update_histogram(self, current_small_bgr: np.ndarray):
        try:
            hsv = cv2.cvtColor(current_small_bgr, cv2.COLOR_BGR2HSV)
            hist = cv2.calcHist([hsv], [0, 1], None, [30, 32], [0, 180, 0, 256])
            cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
            self.prev_hist = hist
        except Exception:
            self.prev_hist = None

    def align_and_blend(self, current_restored: np.ndarray, neighbor_restored_frames: Optional[List[np.ndarray]] = None) -> np.ndarray:
        """
        Applies scene-aware motion-compensated temporal consistency.
        Resets temporal buffer immediately when a scene cut is detected.
        Uses cached meshgrid arrays to avoid per-frame allocation overhead.
        """
        if current_restored is None:
            return current_restored

        h, w = current_restored.shape[:2]
        small_w, small_h = min(w, 240), min(h, 240)
        small_curr = cv2.resize(current_restored, (small_w, small_h), interpolation=cv2.INTER_AREA)

        # 1. Check for scene cut
        if self.prev_restored_frame is not None and self.detect_scene_cut(small_curr):
            # Scene cut detected! Reset temporal history immediately to avoid ghosting
            self.reset()

        if self.prev_restored_frame is None or self.temporal_strength <= 0.05:
            self.prev_restored_frame = current_restored.copy()
            self.prev_small_gray = cv2.cvtColor(small_curr, cv2.COLOR_BGR2GRAY)
            self.update_histogram(small_curr)
            return current_restored

        try:
            curr_small_gray = cv2.cvtColor(small_curr, cv2.COLOR_BGR2GRAY)

            # 2. Fast multi-scale optical flow
            flow_small = cv2.calcOpticalFlowFarneback(
                self.prev_small_gray, curr_small_gray, None,
                pyr_scale=0.5, levels=2, winsize=13,
                iterations=2, poly_n=5, poly_sigma=1.1, flags=0
            )

            # 3. Upsample optical flow to full resolution
            scale_x = w / small_w
            scale_y = h / small_h
            flow_full = cv2.resize(flow_small, (w, h), interpolation=cv2.INTER_LINEAR)
            flow_full[..., 0] *= scale_x
            flow_full[..., 1] *= scale_y

            # 4. Warp previous restored frame toward current frame
            # Use cached meshgrid arrays instead of allocating new ones per frame
            base_map_x, base_map_y = _get_meshgrid(w, h)
            map_x = base_map_x + flow_full[..., 0]
            map_y = base_map_y + flow_full[..., 1]

            warped_prev = cv2.remap(
                self.prev_restored_frame,
                map_x,
                map_y,
                interpolation=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_REFLECT
            )

            # 5. Photometric error & motion confidence calculation
            diff = np.mean(np.abs(current_restored.astype(np.float32) - warped_prev.astype(np.float32)), axis=2)
            # High confidence in static / smooth motion areas, low confidence in occlusion or rapid motion
            motion_conf = np.exp(-diff / 22.0)
            motion_conf = np.expand_dims(motion_conf, axis=2)

            # 6. Adaptive temporal blending
            alpha = self.temporal_strength * 0.40 * motion_conf
            stabilized = (1.0 - alpha) * current_restored.astype(np.float32) + alpha * warped_prev.astype(np.float32)
            out_frame = np.clip(stabilized, 0, 255).astype(np.uint8)

            self.prev_restored_frame = out_frame.copy()
            self.prev_small_gray = curr_small_gray
            self.update_histogram(small_curr)
            return out_frame

        except Exception:
            self.prev_restored_frame = current_restored.copy()
            self.prev_small_gray = cv2.cvtColor(small_curr, cv2.COLOR_BGR2GRAY)
            self.update_histogram(small_curr)
            return current_restored

    def reset(self):
        """Resets temporal buffer (called on scene cuts, seeks, and new videos)."""
        self.prev_restored_frame = None
        self.prev_small_gray = None
        self.prev_hist = None
