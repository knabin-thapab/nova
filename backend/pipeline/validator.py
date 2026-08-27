import os
import cv2
from typing import Dict, Any, Tuple
from .media_probe import probe_video


class VideoValidator:
    """
    Output Media Integrity Validator.
    Never marks processing completed based on exit code 0 alone; performs actual media verification.
    """
    @staticmethod
    def verify_output(
        output_path: str,
        expected_width: int,
        expected_height: int,
        expected_fps: float,
        expected_frames: int,
        tolerance_frames: int = 2
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Validates the generated output video file against expected parameters.
        Returns (passed: bool, details: dict)
        """
        if not os.path.exists(output_path):
            return False, {"error": "Output file does not exist on disk."}

        file_size = os.path.getsize(output_path)
        if file_size == 0:
            return False, {"error": "Output file is empty (0 bytes)."}

        try:
            actual_meta = probe_video(output_path)
        except Exception as e:
            return False, {"error": f"Failed to probe output video: {str(e)}"}

        actual_w = actual_meta["width"]
        actual_h = actual_meta["height"]
        actual_fps = actual_meta["fps"]
        actual_frames = actual_meta["frameCount"]

        dim_pass = (actual_w == expected_width) and (actual_h == expected_height)
        fps_pass = abs(actual_fps - expected_fps) <= 1.0
        frame_pass = abs(actual_frames - expected_frames) <= tolerance_frames

        passed = dim_pass and fps_pass and frame_pass and (file_size > 1024)

        report = {
            "passed": passed,
            "fileSize": file_size,
            "expected": {
                "width": expected_width,
                "height": expected_height,
                "fps": expected_fps,
                "frameCount": expected_frames
            },
            "actual": {
                "width": actual_w,
                "height": actual_h,
                "fps": actual_fps,
                "frameCount": actual_frames,
                "codec": actual_meta.get("codec"),
                "bitrate": actual_meta.get("bitrate")
            },
            "checks": {
                "resolutionValid": dim_pass,
                "fpsValid": fps_pass,
                "framesValid": frame_pass,
                "fileSizeValid": file_size > 1024
            }
        }

        return passed, report

    @staticmethod
    def verify_image(output_path: str, expected_width: int, expected_height: int) -> Tuple[bool, Dict[str, Any]]:
        """Validates photo restoration output file existence and decodability."""
        if not os.path.exists(output_path):
            return False, {"error": "Output file does not exist on disk."}

        file_size = os.path.getsize(output_path)
        if file_size == 0:
            return False, {"error": "Output file is empty (0 bytes)."}

        img = cv2.imread(output_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return False, {"error": "Failed to decode output image."}

        h, w = img.shape[:2]
        dim_pass = (w == expected_width) and (h == expected_height)

        return dim_pass, {
            "passed": dim_pass,
            "fileSize": file_size,
            "width": w,
            "height": h,
            "expectedWidth": expected_width,
            "expectedHeight": expected_height
        }
