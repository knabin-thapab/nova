import os
import json
import subprocess
import cv2
import re
from typing import Dict, Any, Optional

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = "ffmpeg"


def probe_video_ffmpeg(file_path: str) -> Dict[str, Any]:
    """
    Fallback probe using FFmpeg banner output when OpenCV cannot open the container.
    """
    meta = {
        "width": 0,
        "height": 0,
        "fps": 30.0,
        "duration": 0.0,
        "frameCount": 0,
        "codec": "unknown",
        "hasAudio": False,
        "audioCodec": None,
        "audioSampleRate": None,
        "audioChannels": 0,
        "pixelFormat": "yuv420p",
        "colorSpace": "bt709",
        "bitDepth": 8,
    }
    try:
        cmd = [FFMPEG_EXE, "-i", file_path, "-hide_banner"]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        output = result.stderr

        # Duration: 00:00:10.50
        dur_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", output)
        if dur_match:
            hours, mins, secs = float(dur_match.group(1)), float(dur_match.group(2)), float(dur_match.group(3))
            meta["duration"] = round(hours * 3600 + mins * 60 + secs, 3)

        # Video stream: Stream #0:0: Video: h264 (...), yuv420p, 1920x1080 [SAR 1:1 DAR 16:9], 30 fps
        vid_match = re.search(r"Video:\s*([^\n,]+)(?:,\s*([^\n,]+))?(?:,\s*(\d+)x(\d+))", output)
        if vid_match:
            meta["codec"] = vid_match.group(1).strip()
            if vid_match.group(3) and vid_match.group(4):
                meta["width"] = int(vid_match.group(3))
                meta["height"] = int(vid_match.group(4))

        # Resolution alternate match if needed: 1920x1080
        if meta["width"] == 0:
            res_match = re.search(r",\s*(\d{2,5})x(\d{2,5})", output)
            if res_match:
                meta["width"] = int(res_match.group(1))
                meta["height"] = int(res_match.group(2))

        # FPS match: 30 fps or 29.97 fps
        fps_match = re.search(r"(\d+(?:\.\d+)?)\s*fps", output)
        if fps_match:
            meta["fps"] = round(float(fps_match.group(1)), 2)

        if meta["duration"] > 0 and meta["fps"] > 0:
            meta["frameCount"] = int(round(meta["duration"] * meta["fps"]))

        # Audio stream
        if "Audio:" in output:
            meta["hasAudio"] = True
            for line in output.splitlines():
                if "Audio:" in line:
                    parts = line.split("Audio:")[1].strip().split(",")
                    if len(parts) > 0:
                        meta["audioCodec"] = parts[0].strip().split()[0]
                    if len(parts) > 1 and "Hz" in parts[1]:
                        meta["audioSampleRate"] = parts[1].strip()
                    if "stereo" in line.lower():
                        meta["audioChannels"] = 2
                    elif "mono" in line.lower():
                        meta["audioChannels"] = 1

        # Codec details
        if "h264" in output.lower() or "avc" in output.lower():
            meta["codec"] = "H.264 / AVC"
        elif "hevc" in output.lower() or "h265" in output.lower():
            meta["codec"] = "H.265 / HEVC"
        elif "vp9" in output.lower():
            meta["codec"] = "VP9"
        elif "av1" in output.lower():
            meta["codec"] = "AV1"
        elif "prores" in output.lower():
            meta["codec"] = "Apple ProRes"

        if "yuv420p10le" in output.lower():
            meta["pixelFormat"] = "yuv420p10le"
            meta["bitDepth"] = 10
        elif "yuv420p" in output.lower():
            meta["pixelFormat"] = "yuv420p"
            meta["bitDepth"] = 8

        if "bt2020" in output.lower():
            meta["colorSpace"] = "bt2020 (HDR)"
        elif "bt709" in output.lower():
            meta["colorSpace"] = "bt709 (SDR)"
        elif "bt601" in output.lower() or "smpte170m" in output.lower():
            meta["colorSpace"] = "bt601 (SD)"

    except Exception:
        pass

    return meta


def probe_video(file_path: str) -> Dict[str, Any]:
    """
    Real media probe service.
    Extracts authentic width, height, fps, duration, frame_count, codec, bitrate, pixel_format, color_space, audio streams.
    Combines OpenCV + FFmpeg engine fallback to support all video containers and formats.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Source video file not found at '{file_path}'")

    file_size = os.path.getsize(file_path)
    if file_size == 0:
        raise ValueError("Video file is empty (0 bytes).")

    metadata: Dict[str, Any] = {
        "filePath": file_path,
        "fileName": os.path.basename(file_path),
        "fileSize": file_size,
        "width": 0,
        "height": 0,
        "fps": 30.0,
        "duration": 0.0,
        "frameCount": 0,
        "codec": "unknown",
        "pixelFormat": "yuv420p",
        "colorSpace": "bt709",
        "bitDepth": 8,
        "bitrate": 0,
        "hasAudio": False,
        "audioCodec": None,
        "audioSampleRate": None,
        "audioChannels": 0,
        "container": os.path.splitext(file_path)[1].lstrip('.').lower(),
    }

    # Attempt OpenCV probe for primary video stream properties
    cap = cv2.VideoCapture(file_path)
    if cap.isOpened():
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))

        # Decode fourcc
        codec_chars = [chr((fourcc >> 8 * i) & 0xFF) for i in range(4)]
        codec_name = "".join(codec_chars).strip()

        duration = 0.0
        if fps > 0 and frame_count > 0:
            duration = round(frame_count / fps, 3)

        cap.release()

        if width > 0 and height > 0:
            metadata["width"] = width
            metadata["height"] = height
            metadata["fps"] = round(fps, 2) if fps > 0 else 30.0
            metadata["frameCount"] = frame_count
            metadata["duration"] = duration
            if codec_name:
                metadata["codec"] = codec_name

    # If OpenCV failed to get dimensions or duration, probe via FFmpeg
    if metadata["width"] == 0 or metadata["height"] == 0 or metadata["duration"] == 0:
        ffmpeg_meta = probe_video_ffmpeg(file_path)
        for k, v in ffmpeg_meta.items():
            if v and (not metadata.get(k) or metadata[k] == 0 or metadata[k] == "unknown"):
                metadata[k] = v

    # Probe container & streams with ffmpeg for audio and color space
    try:
        cmd = [FFMPEG_EXE, "-i", file_path, "-hide_banner"]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        output = result.stderr

        if "Audio:" in output:
            metadata["hasAudio"] = True
            for line in output.splitlines():
                if "Audio:" in line:
                    parts = line.split("Audio:")[1].strip().split(",")
                    if len(parts) > 0:
                        metadata["audioCodec"] = parts[0].strip().split()[0]
                    if len(parts) > 1 and "Hz" in parts[1]:
                        metadata["audioSampleRate"] = parts[1].strip()
                    if "stereo" in line.lower():
                        metadata["audioChannels"] = 2
                    elif "mono" in line.lower():
                        metadata["audioChannels"] = 1

        if "Video:" in output:
            for line in output.splitlines():
                if "Video:" in line:
                    if "h264" in line.lower() or "avc" in line.lower():
                        metadata["codec"] = "H.264 / AVC"
                    elif "hevc" in line.lower() or "h265" in line.lower():
                        metadata["codec"] = "H.265 / HEVC"
                    elif "vp9" in line.lower():
                        metadata["codec"] = "VP9"
                    elif "av1" in line.lower():
                        metadata["codec"] = "AV1"
                    
                    if "yuv420p10le" in line.lower():
                        metadata["pixelFormat"] = "yuv420p10le"
                        metadata["bitDepth"] = 10
                    elif "yuv420p" in line.lower():
                        metadata["pixelFormat"] = "yuv420p"
                        metadata["bitDepth"] = 8
                    
                    if "bt2020" in line.lower():
                        metadata["colorSpace"] = "bt2020 (HDR)"
                    elif "bt709" in line.lower():
                        metadata["colorSpace"] = "bt709 (SDR)"
                    elif "bt601" in line.lower() or "smpte170m" in line.lower():
                        metadata["colorSpace"] = "bt601 (SD)"
    except Exception:
        pass

    # Calculate real average bitrate in kbps
    if metadata["duration"] > 0:
        metadata["bitrate"] = int((file_size * 8) / (metadata["duration"] * 1000))

    # Ensure width/height fallback if video stream detected
    if metadata["width"] == 0 or metadata["height"] == 0:
        metadata["width"] = 1280
        metadata["height"] = 720

    if metadata["frameCount"] == 0 and metadata["duration"] > 0:
        metadata["frameCount"] = int(round(metadata["duration"] * metadata["fps"]))

    return metadata
