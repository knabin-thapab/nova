import os
import subprocess
import cv2
import numpy as np
from typing import Optional

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = "ffmpeg"


class VideoEncoder:
    """
    Production Video Encoder using FFmpeg.
    Preserves original audio, handles H.264/H.265 encoding with optimal bitrates.
    Uses a two-pass approach: first write raw frames to temp file, then remux with movflags.
    """
    def __init__(
        self,
        output_path: str,
        fps: float,
        width: int,
        height: int,
        codec: str = "h264",
        quality: int = 20,
        bit_depth: int = 8,
        source_audio_path: Optional[str] = None
    ):
        self.output_path = output_path
        self.fps = fps
        self.width = width
        self.height = height
        self.codec = codec.lower()
        self.quality = quality
        self.bit_depth = bit_depth
        self.source_audio_path = source_audio_path
        # Write to a temp file first, then remux for faststart
        self.raw_output_path = output_path + ".encoding.mp4"
        self.process = None
        self._init_encoder_process()

    def _init_encoder_process(self):
        pix_fmt = "yuv420p"  # Use standard for max compatibility
        
        if "h265" in self.codec or "hevc" in self.codec:
            vcodec = "libx265"
        elif "prores" in self.codec:
            vcodec = "prores_ks"
        else:
            vcodec = "libx264"

        cmd = [
            FFMPEG_EXE,
            "-y",
            "-f", "rawvideo",
            "-vcodec", "rawvideo",
            "-s", "{}x{}".format(self.width, self.height),
            "-pix_fmt", "bgr24",
            "-r", str(self.fps),
            "-i", "pipe:0",
            "-c:v", vcodec,
            "-pix_fmt", pix_fmt,
            "-crf", str(self.quality),
            "-preset", "fast",
            self.raw_output_path
        ]

        self.process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

    def write_frame(self, frame_bgr: np.ndarray):
        """Pipes raw BGR uint8 frame directly into FFmpeg encoder stdin."""
        if self.process is None or self.process.stdin is None:
            return
        h, w = frame_bgr.shape[:2]
        if w != self.width or h != self.height:
            frame_bgr = cv2.resize(frame_bgr, (self.width, self.height), interpolation=cv2.INTER_LANCZOS4)
        try:
            self.process.stdin.write(frame_bgr.tobytes())
        except (BrokenPipeError, OSError):
            pass

    def finalize(self):
        """Finalizes video encoding and remuxes with faststart + optional audio."""
        # Close stdin pipe and wait for FFmpeg to finish
        if self.process and self.process.stdin:
            try:
                self.process.stdin.flush()
                self.process.stdin.close()
            except Exception:
                pass
            try:
                self.process.wait(timeout=120)
            except Exception:
                self.process.kill()
                self.process.wait()

        if not os.path.exists(self.raw_output_path) or os.path.getsize(self.raw_output_path) == 0:
            return

        # Remux with faststart and optionally add audio
        remux_inputs = ["-i", self.raw_output_path]
        maps = ["-map", "0:v:0"]
        audio_codec = []

        if self.source_audio_path and os.path.exists(self.source_audio_path):
            remux_inputs += ["-i", self.source_audio_path]
            maps += ["-map", "1:a:0?"]
            audio_codec = ["-c:a", "aac"]

        remux_cmd = [
            FFMPEG_EXE, "-y",
        ] + remux_inputs + [
            "-c:v", "copy",
        ] + audio_codec + maps + [
            "-movflags", "+faststart",
            self.output_path
        ]

        try:
            result = subprocess.run(remux_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
            if os.path.exists(self.output_path) and os.path.getsize(self.output_path) > 0:
                # Remux succeeded — remove temp
                if os.path.exists(self.raw_output_path):
                    os.remove(self.raw_output_path)
                return
        except Exception:
            pass

        # Fallback: just rename the raw output
        if os.path.exists(self.raw_output_path):
            if os.path.exists(self.output_path):
                os.remove(self.output_path)
            os.rename(self.raw_output_path, self.output_path)
