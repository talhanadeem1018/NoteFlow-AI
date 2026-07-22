"""Audio download and conversion service.

Downloads audio from YouTube using yt-dlp, then converts to
Whisper-compatible format (WAV, 16 kHz, mono) using FFmpeg.
"""

import asyncio
import logging
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Any

import yt_dlp

from app.core.config import settings
from app.core.exceptions import (
    AudioDownloadError,
    InvalidURLError,
    VideoNotFoundError,
)
from app.schemas.video import AudioInfo
from app.services.youtube import extract_video_id

logger = logging.getLogger(__name__)


def _get_temp_dir() -> Path:
    """Get or create the temporary directory for audio files."""
    temp_dir = Path(settings.TEMP_DIR)
    temp_dir.mkdir(parents=True, exist_ok=True)
    return temp_dir


def _sanitize_video_id(video_id: str) -> str:
    """Sanitize video_id to prevent path traversal attacks."""
    # YouTube video IDs are 11 characters: alphanumeric, hyphens, underscores
    if not re.match(r'^[a-zA-Z0-9_-]{11}$', video_id):
        raise AudioDownloadError(f"Invalid video ID format: {video_id}")
    return video_id


def _validate_ffmpeg() -> None:
    """Check that FFmpeg and FFprobe are available on the system."""
    for tool, name in [(settings.FFMPEG_PATH, "FFmpeg"), (settings.FFPROBE_PATH, "FFprobe")]:
        try:
            subprocess.run(
                [tool, "-version"],
                capture_output=True,
                check=True,
                timeout=10,
            )
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
            raise AudioDownloadError(
                f"{name} not found or not working at '{tool}'. "
                f"Please install {name}: {e}"
            )


def _download_audio(url: str, output_path: str) -> str:
    """Download audio-only using yt-dlp. Returns the path of the downloaded file."""
    ydl_opts: dict[str, Any] = {
        "format": "bestaudio/best",
        "outtmpl": output_path,
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 30,
        "retries": 3,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            
            print("=" * 60)
            print("PREPARE_FILENAME:", filename)
            print("EXISTS:", os.path.exists(filename))
            print("=" * 60)
            
            print("=" * 60)
            print("INFO EXT:", info.get("ext"))
            print("REQUESTED OUTPUT:", output_path)

            folder = Path(output_path).parent

            print("FILES IN TEMP DIRECTORY:")
            for f in folder.iterdir():
                print(" -", f.name)

            print("=" * 60)
    
            if info is None:
                raise AudioDownloadError("No info returned from yt-dlp")
    
            folder = Path(output_path).parent
            base = Path(output_path).name

            matches = list(folder.glob(base + "*"))

            print("FOUND FILES:", matches)

            if not matches:
                raise AudioDownloadError("Downloaded audio file not found.")

            actual_path = str(matches[0])
                    
            print("=" * 60)
            print("Downloaded file:", actual_path)
            print("Exists:", os.path.exists(actual_path))
            print("=" * 60)
    
            return actual_path

    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e).lower()
        if "private" in error_msg or "unavailable" in error_msg:
            raise VideoNotFoundError(
                f"Video is private, deleted, or unavailable: {e}"
            ) from e
        raise AudioDownloadError(f"yt-dlp download error: {e}") from e
    except Exception as e:
        raise AudioDownloadError(f"Failed to download audio: {e}") from e


def _convert_to_wav(input_path: str, video_id: str) -> str:
    """Convert audio to WAV format: 16 kHz, mono, 16-bit PCM (Whisper-compatible)."""
    # Note: video_id is already sanitized upstream in download_and_convert_audio
    output_dir = _get_temp_dir()
    output_path = str(output_dir / f"{video_id}.wav")

    cmd = [
        settings.FFMPEG_PATH,
        "-y",                    # Overwrite output
        "-i", input_path,        # Input file
        "-ar", "16000",          # Sample rate: 16 kHz
        "-ac", "1",              # Channels: mono
        "-sample_fmt", "s16",    # Sample format: 16-bit PCM
        "-acodec", "pcm_s16le",  # Codec: PCM 16-bit little-endian
        output_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout for conversion
            check=True,
        )
        return output_path
    except subprocess.TimeoutExpired as e:
        raise AudioDownloadError("FFmpeg conversion timed out after 5 minutes") from e
    except subprocess.CalledProcessError as e:
        raise AudioDownloadError(
            f"FFmpeg conversion failed: {e.stderr or e.stdout}"
        ) from e
    except Exception as e:
        raise AudioDownloadError(f"Unexpected error during audio conversion: {e}") from e


def _cleanup_file(path: str) -> None:
    """Safely remove a temporary file."""
    try:
        file_path = Path(path)
        if file_path.exists():
            file_path.unlink()
            logger.debug("Cleaned up temporary file: %s", path)
    except OSError as e:
        logger.warning("Failed to clean up temporary file %s: %s", path, e)


async def download_and_convert_audio(url: str) -> AudioInfo:
    """
    Download audio from YouTube and convert to Whisper-compatible WAV.

    Flow:
        1. Validate URL and extract video ID
        2. Download best audio using yt-dlp (to temp dir)
        3. Convert to WAV 16kHz mono using FFmpeg
        4. Return audio info (path, duration, size)
        5. Clean up intermediate files

    Raises InvalidURLError, VideoNotFoundError, or AudioDownloadError.
    """
    # Validate URL
    video_id = extract_video_id(url)
    if not video_id:
        raise InvalidURLError(
            f"Invalid YouTube URL: could not extract video ID from '{url}'"
        )

    # Sanitize video_id early for security
    sanitized_id = _sanitize_video_id(video_id)

    # Ensure FFmpeg is available
    await asyncio.to_thread(_validate_ffmpeg)

    temp_dir = _get_temp_dir()
    raw_output = str(temp_dir / f"{sanitized_id}_raw")

    try:
        # Step 1: Download audio
        logger.info("[AUDIO] Starting audio download...")
        downloaded_path = await asyncio.to_thread(_download_audio, url, raw_output)
        logger.info("[AUDIO] Download completed: %s", downloaded_path)

        # Step 2: Convert to WAV
        logger.info("[AUDIO] Starting FFmpeg conversion to WAV...")
        wav_path = await asyncio.to_thread(_convert_to_wav, downloaded_path, sanitized_id)
        logger.info("[AUDIO] FFmpeg conversion completed: %s", wav_path)

        # Step 3: Get file info
        file_size = os.path.getsize(wav_path)
        logger.info("[AUDIO] WAV file size: %d bytes", file_size)

        # Get duration from the WAV file using ffprobe
        duration = await _get_audio_duration(wav_path)
        logger.info("[AUDIO] Audio duration: %s seconds", duration)

        return AudioInfo(
            video_id=video_id,
            audio_path=wav_path,
            duration=duration,
            file_size=file_size,
            audio_format="wav",
        )

    except Exception as e:
        logger.exception("[AUDIO] download_and_convert_audio failed: %s", e)
        raise
    finally:
        # Clean up intermediate downloaded file (keep the WAV)
        _cleanup_file(raw_output)
        # Also try common extensions
        for ext in ["webm", "mp3", "m4a", "opus", "ogg", "wav"]:
            _cleanup_file(f"{raw_output}.{ext}")


async def _get_audio_duration(wav_path: str) -> int | None:
    """Get audio duration in seconds using ffprobe."""
    try:
        cmd = [
            settings.FFPROBE_PATH,
            "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            wav_path,
        ]
        result = await asyncio.to_thread(
            lambda: subprocess.run(
                cmd, capture_output=True, text=True, timeout=30
            )
        )
        if result.returncode == 0 and result.stdout.strip():
            return int(float(result.stdout.strip()))
        else:
            logger.warning("ffprobe failed for %s: %s", wav_path, result.stderr)
    except Exception as e:
        logger.warning("Failed to get audio duration for %s: %s", wav_path, e)
    return None


def cleanup_audio_file(video_id: str) -> bool:
    """
    Remove the WAV file for a given video ID.

    Returns True if the file was found and removed.
    """
    temp_dir = _get_temp_dir()
    wav_path = temp_dir / f"{video_id}.wav"
    if wav_path.exists():
        wav_path.unlink()
        return True
    return False


def cleanup_stale_audio_files(max_age_hours: int = 24) -> int:
    """
    Remove audio files older than max_age_hours.

    Returns the number of files removed.
    """
    temp_dir = _get_temp_dir()
    now = time.time()
    max_age_seconds = max_age_hours * 3600
    removed_count = 0

    for wav_file in temp_dir.glob("*.wav"):
        try:
            file_age = now - wav_file.stat().st_mtime
            if file_age > max_age_seconds:
                wav_file.unlink()
                removed_count += 1
                logger.debug("Cleaned up stale audio file: %s (age: %.1f hours)", wav_file.name, file_age / 3600)
        except OSError as e:
            logger.warning("Failed to clean up stale file %s: %s", wav_file.name, e)

    return removed_count
