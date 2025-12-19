"""
Audio Processing Service
Uses FFmpeg for audio remixing, volume adjustment, and music overlay
"""

import os
import uuid
import shutil
import asyncio
import tempfile
import subprocess
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

import httpx


@dataclass
class AudioProcessResult:
    """Result of audio processing operation"""
    buffer: bytes
    duration: float
    file_size: int


class AudioService:
    """Audio processing service using FFmpeg"""
    
    @staticmethod
    def _get_ffmpeg_path() -> str:
        """Get FFmpeg executable path"""
        ffmpeg_path = shutil.which("ffmpeg")
        if ffmpeg_path:
            return ffmpeg_path
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
    async def download_file(url: str) -> bytes:
        """Download file from URL"""
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise ValueError(f"Failed to download file: HTTP {response.status_code}")
            return response.content
    
    @classmethod
    async def probe_video(cls, file_path: str) -> tuple[float, bool]:
        """Probe video to get duration and check for audio stream"""
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
            result = subprocess.run(args, capture_output=True, text=True, timeout=60)
            return result.stdout, result.returncode
        
        stdout, returncode = await loop.run_in_executor(None, run_ffprobe)
        
        if returncode != 0:
            return 0.0, False
        
        try:
            data = json.loads(stdout)
            duration = float(data.get("format", {}).get("duration", 0))
            has_audio = any(
                s.get("codec_type") == "audio" 
                for s in data.get("streams", [])
            )
            return duration, has_audio
        except (json.JSONDecodeError, KeyError):
            return 0.0, False
    
    @classmethod
    async def process_audio(
        cls,
        video_url: str,
        mute_original: bool = False,
        background_music_url: Optional[str] = None,
        original_volume: int = 100,
        music_volume: int = 80,
        timeout_seconds: int = 300
    ) -> AudioProcessResult:
        """
        Process video audio:
        - Add background music
        - Mute original audio
        - Adjust volume levels
        
        Uses FFmpeg with AAC encoding at 192k bitrate.
        Video is copied without re-encoding for speed.
        """
        ffmpeg_path = cls._get_ffmpeg_path()
        
        # Create temp directory
        temp_dir = Path(tempfile.gettempdir()) / f"audio-remix-{uuid.uuid4()}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        input_video_path = temp_dir / "input_video.mp4"
        input_audio_path = temp_dir / "input_audio.mp3"
        output_path = temp_dir / "output.mp4"
        
        try:
            # Download source files
            video_data = await cls.download_file(video_url)
            input_video_path.write_bytes(video_data)
            
            has_background_music = False
            if background_music_url:
                audio_data = await cls.download_file(background_music_url)
                input_audio_path.write_bytes(audio_data)
                has_background_music = True
            
            # Probe video
            duration, video_has_audio = await cls.probe_video(str(input_video_path))
            
            # Build FFmpeg command
            loop = asyncio.get_event_loop()
            
            # Volume levels (convert 0-100 to 0.0-1.0)
            orig_vol = original_volume / 100.0
            music_vol = music_volume / 100.0
            
            if has_background_music:
                # With background music
                if video_has_audio and not mute_original:
                    # Mix original audio with background music
                    filter_complex = (
                        f"[0:a]volume={orig_vol}[v_orig];"
                        f"[1:a]volume={music_vol}[bg_music];"
                        f"[v_orig][bg_music]amix=inputs=2:duration=first:dropout_transition=2[aout]"
                    )
                    args = [
                        ffmpeg_path, "-y",
                        "-i", str(input_video_path),
                        "-stream_loop", "-1",
                        "-i", str(input_audio_path),
                        "-filter_complex", filter_complex,
                        "-map", "0:v",
                        "-map", "[aout]",
                        "-c:v", "copy",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        "-shortest",
                        "-movflags", "+faststart",
                        str(output_path)
                    ]
                else:
                    # Only background music (mute original or no original audio)
                    filter_complex = f"[1:a]volume={music_vol}[aout]"
                    args = [
                        ffmpeg_path, "-y",
                        "-i", str(input_video_path),
                        "-stream_loop", "-1",
                        "-i", str(input_audio_path),
                        "-filter_complex", filter_complex,
                        "-map", "0:v",
                        "-map", "[aout]",
                        "-c:v", "copy",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        "-shortest",
                        "-movflags", "+faststart",
                        str(output_path)
                    ]
            else:
                # No background music
                if video_has_audio and not mute_original:
                    # Just adjust volume of original audio
                    args = [
                        ffmpeg_path, "-y",
                        "-i", str(input_video_path),
                        "-af", f"volume={orig_vol}",
                        "-c:v", "copy",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        "-movflags", "+faststart",
                        str(output_path)
                    ]
                else:
                    # Mute original or no audio - add silent track
                    args = [
                        ffmpeg_path, "-y",
                        "-i", str(input_video_path),
                        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                        "-map", "0:v",
                        "-map", "1:a",
                        "-c:v", "copy",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        "-shortest",
                        "-movflags", "+faststart",
                        str(output_path)
                    ]
            
            def run_ffmpeg():
                result = subprocess.run(
                    args,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds
                )
                return result.returncode, result.stderr
            
            returncode, stderr = await loop.run_in_executor(None, run_ffmpeg)
            
            if returncode != 0:
                raise RuntimeError(f"Audio processing failed: {stderr[-500:] if stderr else 'Unknown error'}")
            
            # Read output
            output_buffer = output_path.read_bytes()
            
            return AudioProcessResult(
                buffer=output_buffer,
                duration=duration,
                file_size=len(output_buffer)
            )
            
        finally:
            # Cleanup
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass
