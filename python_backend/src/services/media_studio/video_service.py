"""
Video Processing Service
Uses FFmpeg for high-quality video resizing and merging
"""

import os
import uuid
import shutil
import asyncio
import tempfile
import subprocess
from pathlib import Path
from typing import Literal, Optional
from dataclasses import dataclass

import httpx


# Platform video presets - 2025 Official Standards
VIDEO_PLATFORM_PRESETS = {
    # Vertical (9:16) - Short-form video platforms
    "youtube-short": {"width": 1080, "height": 1920, "aspect_ratio": "9:16", "name": "YouTube Shorts", "max_duration": 60},
    "instagram-reel": {"width": 1080, "height": 1920, "aspect_ratio": "9:16", "name": "Instagram Reels", "max_duration": 90},
    "instagram-story": {"width": 1080, "height": 1920, "aspect_ratio": "9:16", "name": "Instagram Story", "max_duration": 60},
    "tiktok": {"width": 1080, "height": 1920, "aspect_ratio": "9:16", "name": "TikTok", "max_duration": 600},
    "facebook-reel": {"width": 1080, "height": 1920, "aspect_ratio": "9:16", "name": "Facebook Reels", "max_duration": 90},
    "twitter-portrait": {"width": 1080, "height": 1920, "aspect_ratio": "9:16", "name": "Twitter/X (Vertical)", "max_duration": 140},
    
    # Square (1:1) - Feed posts
    "instagram-post": {"width": 1080, "height": 1080, "aspect_ratio": "1:1", "name": "Instagram Post (Square)", "max_duration": 60},
    "facebook-post-square": {"width": 1080, "height": 1080, "aspect_ratio": "1:1", "name": "Facebook Post (Square)", "max_duration": 240},
    "linkedin-square": {"width": 1080, "height": 1080, "aspect_ratio": "1:1", "name": "LinkedIn (Square)", "max_duration": 600},
    
    # Portrait (4:5) - Optimized for mobile feed
    "instagram-feed": {"width": 1080, "height": 1350, "aspect_ratio": "4:5", "name": "Instagram Feed (4:5)", "max_duration": 60},
    "facebook-feed": {"width": 1080, "height": 1350, "aspect_ratio": "4:5", "name": "Facebook Feed (4:5)", "max_duration": 240},
    
    # Landscape (16:9) - Traditional video
    "youtube": {"width": 1920, "height": 1080, "aspect_ratio": "16:9", "name": "YouTube (1080p)", "max_duration": None},
    "facebook-post": {"width": 1920, "height": 1080, "aspect_ratio": "16:9", "name": "Facebook (16:9)", "max_duration": 240},
    "twitter": {"width": 1920, "height": 1080, "aspect_ratio": "16:9", "name": "Twitter/X (16:9)", "max_duration": 140},
    "linkedin": {"width": 1920, "height": 1080, "aspect_ratio": "16:9", "name": "LinkedIn (16:9)", "max_duration": 600},
}

# Maximum total duration for merged videos (5 minutes)
MAX_MERGE_DURATION_SECONDS = 300


@dataclass
class VideoProbeResult:
    """Result of video probe operation"""
    duration: float
    width: int
    height: int
    has_audio: bool


@dataclass
class VideoResizeResult:
    """Result of video resize operation"""
    buffer: bytes
    duration: float
    width: int
    height: int
    file_size: int


@dataclass
class VideoMergeResult:
    """Result of video merge operation"""
    buffer: bytes
    total_duration: float
    is_vertical: bool
    output_width: int
    output_height: int
    file_size: int


class VideoService:
    """Video processing service using FFmpeg"""
    
    @staticmethod
    def get_presets() -> list[dict]:
        """Get all available platform presets"""
        return [
            {"id": key, **value}
            for key, value in VIDEO_PLATFORM_PRESETS.items()
        ]
    
    @staticmethod
    def get_preset(platform: str) -> Optional[dict]:
        """Get a specific platform preset"""
        return VIDEO_PLATFORM_PRESETS.get(platform)
    
    @staticmethod
    def _get_ffmpeg_path() -> str:
        """Get FFmpeg executable path"""
        # Check for ffmpeg in PATH
        ffmpeg_path = shutil.which("ffmpeg")
        if ffmpeg_path:
            return ffmpeg_path
        # Common installation paths on Windows
        common_paths = [
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            r"C:\Users\Public\ffmpeg\bin\ffmpeg.exe",
        ]
        for path in common_paths:
            if os.path.exists(path):
                return path
        raise RuntimeError("FFmpeg not found. Please install FFmpeg and add it to PATH.")
    
    @staticmethod
    def _get_ffprobe_path() -> str:
        """Get FFprobe executable path"""
        ffprobe_path = shutil.which("ffprobe")
        if ffprobe_path:
            return ffprobe_path
        common_paths = [
            r"C:\ffmpeg\bin\ffprobe.exe",
            r"C:\Program Files\ffmpeg\bin\ffprobe.exe",
            r"C:\Users\Public\ffmpeg\bin\ffprobe.exe",
        ]
        for path in common_paths:
            if os.path.exists(path):
                return path
        raise RuntimeError("FFprobe not found. Please install FFmpeg and add it to PATH.")
    
    @staticmethod
    async def download_video(url: str) -> bytes:
        """Download video from URL"""
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise ValueError(f"Failed to download video: HTTP {response.status_code}")
            return response.content
    
    @classmethod
    async def probe_video(cls, file_path: str) -> VideoProbeResult:
        """Probe video file to get metadata using FFprobe"""
        import json
        
        ffprobe_path = cls._get_ffprobe_path()
        
        args = [
            ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path
        ]
        
        loop = asyncio.get_event_loop()
        
        def run_ffprobe():
            result = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=60
            )
            return result.stdout, result.stderr, result.returncode
        
        stdout, stderr, returncode = await loop.run_in_executor(None, run_ffprobe)
        
        if returncode != 0:
            raise RuntimeError(f"FFprobe failed: {stderr}")
        
        data = json.loads(stdout)
        
        # Find video and audio streams
        video_stream = None
        audio_stream = None
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video" and not video_stream:
                video_stream = stream
            elif stream.get("codec_type") == "audio" and not audio_stream:
                audio_stream = stream
        
        duration = float(data.get("format", {}).get("duration", 0))
        if not duration and video_stream:
            duration = float(video_stream.get("duration", 0))
        
        return VideoProbeResult(
            duration=duration,
            width=video_stream.get("width", 1920) if video_stream else 1920,
            height=video_stream.get("height", 1080) if video_stream else 1080,
            has_audio=audio_stream is not None
        )
    
    @classmethod
    async def resize_video(
        cls,
        video_url: str,
        target_width: int,
        target_height: int,
        timeout_seconds: int = 300
    ) -> VideoResizeResult:
        """
        Resize video to target dimensions using FFmpeg.
        Uses high quality settings: CRF 18, medium preset, H.264 High Profile.
        """
        ffmpeg_path = cls._get_ffmpeg_path()
        
        # Create temp directory
        temp_dir = Path(tempfile.gettempdir()) / f"video-resize-{uuid.uuid4()}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        input_path = temp_dir / "input.mp4"
        output_path = temp_dir / "output.mp4"
        
        try:
            # Download video
            video_data = await cls.download_video(video_url)
            input_path.write_bytes(video_data)
            
            # Get input duration
            probe = await cls.probe_video(str(input_path))
            
            # Video filter: scale and crop to fill frame (no black bars)
            video_filter = (
                f"scale={target_width}:{target_height}:"
                f"force_original_aspect_ratio=increase,"
                f"crop={target_width}:{target_height},"
                f"setsar=1,format=yuv420p"
            )
            
            # Build FFmpeg command with high quality settings
            args = [
                ffmpeg_path,
                "-y",
                "-threads", "0",
                "-i", str(input_path),
                "-vf", video_filter,
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "18",
                "-profile:v", "high",
                "-level", "4.1",
                "-c:a", "aac",
                "-ar", "44100",
                "-ac", "2",
                "-b:a", "256k",
                "-movflags", "+faststart",
                str(output_path)
            ]
            
            loop = asyncio.get_event_loop()
            
            def run_ffmpeg():
                result = subprocess.run(
                    args,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds
                )
                return result.returncode, result.stderr
            
            try:
                returncode, stderr = await loop.run_in_executor(None, run_ffmpeg)
            except subprocess.TimeoutExpired:
                raise RuntimeError("Video processing timed out. Try with a shorter video.")
            
            # If failed (possibly no audio), try with silent audio
            if returncode != 0:
                args_silent = [
                    ffmpeg_path,
                    "-y",
                    "-threads", "0",
                    "-i", str(input_path),
                    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                    "-vf", video_filter,
                    "-map", "0:v",
                    "-map", "1:a",
                    "-c:v", "libx264",
                    "-preset", "medium",
                    "-crf", "18",
                    "-profile:v", "high",
                    "-level", "4.1",
                    "-c:a", "aac",
                    "-b:a", "256k",
                    "-movflags", "+faststart",
                    "-shortest",
                    str(output_path)
                ]
                
                def run_silent():
                    result = subprocess.run(
                        args_silent,
                        capture_output=True,
                        text=True,
                        timeout=timeout_seconds
                    )
                    return result.returncode, result.stderr
                
                returncode, stderr = await loop.run_in_executor(None, run_silent)
                
                if returncode != 0:
                    raise RuntimeError(f"FFmpeg failed: {stderr[-500:] if stderr else 'Unknown error'}")
            
            # Read output
            output_buffer = output_path.read_bytes()
            
            return VideoResizeResult(
                buffer=output_buffer,
                duration=probe.duration,
                width=target_width,
                height=target_height,
                file_size=len(output_buffer)
            )
            
        finally:
            # Cleanup
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass
    
    @classmethod
    async def resize_for_platform(
        cls,
        video_url: str,
        platform: Optional[str] = None,
        custom_width: Optional[int] = None,
        custom_height: Optional[int] = None
    ) -> tuple[VideoResizeResult, str]:
        """
        Resize video for a specific platform or custom dimensions.
        Returns tuple of (result, platform_name)
        """
        if platform and platform in VIDEO_PLATFORM_PRESETS:
            preset = VIDEO_PLATFORM_PRESETS[platform]
            target_width = preset["width"]
            target_height = preset["height"]
            platform_name = preset["name"]
        elif custom_width and custom_height:
            target_width = custom_width
            target_height = custom_height
            platform_name = f"Custom ({custom_width}x{custom_height})"
        else:
            raise ValueError("Either platform or custom dimensions required")
        
        result = await cls.resize_video(video_url, target_width, target_height)
        return result, platform_name
    
    @classmethod
    async def merge_videos(
        cls,
        video_urls: list[str],
        resolution: Literal["original", "720p", "1080p"] = "720p",
        quality: Literal["draft", "high"] = "draft",
        timeout_seconds: int = 600
    ) -> VideoMergeResult:
        """
        Merge multiple videos into one using FFmpeg.
        Features:
        - Audio normalization (loudnorm) for consistent volume
        - Auto-detection of vertical content
        - 5-minute duration limit
        - High quality encoding
        """
        if len(video_urls) < 2:
            raise ValueError("At least 2 videos are required for merging")
        
        ffmpeg_path = cls._get_ffmpeg_path()
        
        # Create temp directory
        temp_dir = Path(tempfile.gettempdir()) / f"video-merge-{uuid.uuid4()}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        downloaded_files: list[Path] = []
        normalized_files: list[Path] = []
        
        # Quality settings
        is_high_quality = quality == "high"
        preset = "slow" if is_high_quality else "fast"
        crf = "18" if is_high_quality else "24"
        audio_bitrate = "256k" if is_high_quality else "128k"
        
        try:
            # 1. Download all videos
            for i, url in enumerate(video_urls):
                video_data = await cls.download_video(url)
                if not video_data:
                    raise ValueError(f"Video {i + 1} is empty")
                file_path = temp_dir / f"input-{i}.mp4"
                file_path.write_bytes(video_data)
                downloaded_files.append(file_path)
            
            # 2. Probe all videos
            probes: list[VideoProbeResult] = []
            total_duration = 0.0
            vertical_count = 0
            horizontal_count = 0
            
            for i, file_path in enumerate(downloaded_files):
                probe = await cls.probe_video(str(file_path))
                probes.append(probe)
                total_duration += probe.duration
                
                if probe.height > probe.width:
                    vertical_count += 1
                else:
                    horizontal_count += 1
            
            # 3. Check duration limit
            if total_duration > MAX_MERGE_DURATION_SECONDS:
                raise ValueError(
                    f"Total duration ({int(total_duration)}s) exceeds the 5-minute limit. "
                    "Please remove some clips."
                )
            
            # 4. Determine output orientation
            is_vertical = vertical_count > horizontal_count
            
            # 5. Determine output resolution
            first_probe = probes[0]
            output_width = first_probe.width
            output_height = first_probe.height
            
            if resolution == "720p":
                if output_width > 1280 or output_height > 720:
                    if is_vertical:
                        output_width, output_height = 720, 1280
                    else:
                        output_width, output_height = 1280, 720
            elif resolution == "1080p":
                if output_width > 1920 or output_height > 1080:
                    if is_vertical:
                        output_width, output_height = 1080, 1920
                    else:
                        output_width, output_height = 1920, 1080
            
            # Scale filter with padding for consistent dimensions
            scale_filter = (
                f"scale={output_width}:{output_height}:"
                f"force_original_aspect_ratio=decrease,"
                f"pad={output_width}:{output_height}:(ow-iw)/2:(oh-ih)/2:black,"
                f"setsar=1"
            )
            
            # 6. Normalize each video
            loop = asyncio.get_event_loop()
            
            for i, (file_path, probe) in enumerate(zip(downloaded_files, probes)):
                normalized_path = temp_dir / f"normalized-{i}.mp4"
                
                video_filter = f"{scale_filter},fps=30,format=yuv420p"
                audio_filter = (
                    "aresample=44100,"
                    "aformat=sample_fmts=fltp:channel_layouts=stereo,"
                    "loudnorm=I=-16:TP=-1.5:LRA=11"
                )
                
                if probe.has_audio:
                    args = [
                        ffmpeg_path, "-y", "-threads", "0",
                        "-i", str(file_path),
                        "-filter_complex", f"[0:v]{video_filter}[v];[0:a]{audio_filter}[a]",
                        "-map", "[v]", "-map", "[a]",
                        "-c:v", "libx264",
                        "-preset", preset,
                        "-crf", crf,
                        "-profile:v", "high",
                        "-level", "4.1",
                        "-c:a", "aac",
                        "-b:a", audio_bitrate,
                        "-ar", "44100",
                        "-ac", "2",
                        "-movflags", "+faststart",
                        str(normalized_path)
                    ]
                else:
                    # Add silent audio
                    args = [
                        ffmpeg_path, "-y", "-threads", "0",
                        "-i", str(file_path),
                        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                        "-filter_complex", f"[0:v]{video_filter}[v]",
                        "-map", "[v]", "-map", "1:a",
                        "-c:v", "libx264",
                        "-preset", preset,
                        "-crf", crf,
                        "-profile:v", "high",
                        "-level", "4.1",
                        "-c:a", "aac",
                        "-b:a", audio_bitrate,
                        "-ar", "44100",
                        "-ac", "2",
                        "-shortest",
                        "-movflags", "+faststart",
                        str(normalized_path)
                    ]
                
                def run_normalize(cmd):
                    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_seconds)
                
                result = await loop.run_in_executor(None, lambda: run_normalize(args))
                
                if result.returncode != 0:
                    # Fallback: try with silent audio
                    fallback_args = [
                        ffmpeg_path, "-y", "-threads", "0",
                        "-i", str(file_path),
                        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                        "-filter_complex", f"[0:v]{video_filter}[v]",
                        "-map", "[v]", "-map", "1:a",
                        "-c:v", "libx264",
                        "-preset", preset,
                        "-crf", crf,
                        "-c:a", "aac",
                        "-b:a", audio_bitrate,
                        "-shortest",
                        "-movflags", "+faststart",
                        str(normalized_path)
                    ]
                    result = await loop.run_in_executor(None, lambda: run_normalize(fallback_args))
                    
                    if result.returncode != 0:
                        raise RuntimeError(f"Failed to normalize video {i + 1}")
                
                normalized_files.append(normalized_path)
            
            # 7. Create concat list
            concat_path = temp_dir / "concat.txt"
            concat_content = "\n".join(
                f"file '{f.as_posix()}'" for f in normalized_files
            )
            concat_path.write_text(concat_content)
            
            # 8. Concatenate all normalized videos
            output_path = temp_dir / "output.mp4"
            concat_args = [
                ffmpeg_path, "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_path),
                "-c", "copy",
                "-movflags", "+faststart",
                str(output_path)
            ]
            
            def run_concat():
                return subprocess.run(concat_args, capture_output=True, text=True, timeout=timeout_seconds)
            
            result = await loop.run_in_executor(None, run_concat)
            
            if result.returncode != 0:
                raise RuntimeError(f"Video concatenation failed: {result.stderr[-500:]}")
            
            # 9. Read output
            output_buffer = output_path.read_bytes()
            
            return VideoMergeResult(
                buffer=output_buffer,
                total_duration=total_duration,
                is_vertical=is_vertical,
                output_width=output_width,
                output_height=output_height,
                file_size=len(output_buffer)
            )
            
        finally:
            # Cleanup
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass
