import os
import subprocess
import cv2
import numpy as np
from typing import Generator, Tuple, Optional

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = "ffmpeg"


class VideoDecoder:
    """
    Streaming Video Decoder with OpenCV + FFmpeg Dual Engine.
    Extracts frames iteratively with timestamp tracking without loading the whole video into RAM.
    """
    def __init__(self, video_path: str):
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found: {video_path}")
        self.video_path = video_path
        self.cap = cv2.VideoCapture(video_path)
        self.use_ffmpeg_pipe = False
        self.ffmpeg_proc = None

        if self.cap.isOpened():
            self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            self.fps = float(self.cap.get(cv2.CAP_PROP_FPS))
            self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        else:
            self.width, self.height, self.fps, self.total_frames = 0, 0, 30.0, 0

        # Fallback if OpenCV cannot read
        if self.width <= 0 or self.height <= 0 or not self.cap.isOpened():
            from .media_probe import probe_video_ffmpeg
            meta = probe_video_ffmpeg(video_path)
            self.width = meta.get("width", 1280)
            self.height = meta.get("height", 720)
            self.fps = meta.get("fps", 30.0)
            self.total_frames = meta.get("frameCount", 0)
            self.use_ffmpeg_pipe = True

        if self.fps <= 0:
            self.fps = 30.0

    def stream_frames(self) -> Generator[Tuple[int, float, np.ndarray], None, None]:
        """
        Yields (frame_index, timestamp_sec, bgr_frame)
        """
        if not self.use_ffmpeg_pipe and self.cap and self.cap.isOpened():
            frame_idx = 0
            while True:
                ret, frame = self.cap.read()
                if not ret or frame is None:
                    break
                timestamp = frame_idx / self.fps
                yield frame_idx, timestamp, frame
                frame_idx += 1
            return

        # FFmpeg rawvideo pipe fallback
        cmd = [
            FFMPEG_EXE,
            "-i", self.video_path,
            "-f", "rawvideo",
            "-pix_fmt", "bgr24",
            "-vsync", "0",
            "pipe:1"
        ]
        self.ffmpeg_proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            bufsize=10**7
        )

        frame_size = self.width * self.height * 3
        frame_idx = 0
        while True:
            raw_frame = self.ffmpeg_proc.stdout.read(frame_size)
            if len(raw_frame) < frame_size:
                break
            frame = np.frombuffer(raw_frame, dtype=np.uint8).reshape((self.height, self.width, 3))
            timestamp = frame_idx / self.fps
            yield frame_idx, timestamp, frame
            frame_idx += 1

    def get_frame_at_index(self, index: int) -> Optional[np.ndarray]:
        if self.cap and self.cap.isOpened():
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, index)
            ret, frame = self.cap.read()
            return frame if ret else None
        return None

    def close(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()
        if self.ffmpeg_proc:
            try:
                self.ffmpeg_proc.kill()
            except Exception:
                pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
