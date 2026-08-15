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

import yt_dlp

from app.core.config import settings
from app.core.exceptions import (
    AudioDownloadError,
    InvalidURLError,
    VideoNotFoundError,
)
from app.schemas.video import AudioInfo
from app.services.youtube import (
    BOT_CHECK_ERROR_MESSAGE,
    build_ytdlp_options,
    extract_video_id,
    is_bot_check_error,
)

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


def _is_retryable_download_error(error_message: str) -> bool:
    """Return True for transient yt-dlp failures that are safe to retry."""
    normalized = error_message.lower()
    if any(token in normalized for token in ("private", "unavailable", "deleted", "not found")):
        return False
    if is_bot_check_error(error_message):
        return True
    return any(
        token in normalized
        for token in (
            "http error 429",
            "too many requests",
            "rate limit",
            "timed out",
            "timeout",
            "temporarily unavailable",
            "temporary",
            "connection",
            "network",
            "socket",
            "ssl",
            "unable to download webpage",
        )
    )


def _get_download_error_message(error_message: str) -> str:
    """Convert yt-dlp output into a clearer user-facing error message."""
    if is_bot_check_error(error_message):
        return BOT_CHECK_ERROR_MESSAGE
    normalized = error_message.lower()
    if any(token in normalized for token in ("private", "unavailable", "deleted", "not found")):
        return "Video is private, deleted, or unavailable."
    if any(token in normalized for token in ("http error 429", "too many requests", "rate limit")):
        return "YouTube temporarily rate-limited the download. Please try again shortly."
    return "The audio download failed. Please try again later."


def _download_audio(url: str, output_path: str) -> str:
    """Download audio-only using yt-dlp. Returns the path of the downloaded file.

    Uses the shared hardened options (player-client fallback chain, optional
    operator proxy / cookies file) from ``build_ytdlp_options``. No browser
    cookies are ever read, so end users never configure anything.
    """
    max_attempts = 3
    last_error: str | None = None

    for attempt in range(max_attempts):
        try:
            ydl_opts = build_ytdlp_options(download=True, output_path=output_path)

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)

                if info is None:
                    raise AudioDownloadError("No info returned from yt-dlp")

                folder = Path(output_path).parent
                base = Path(output_path).name
                matches = list(folder.glob(base + "*"))

                if not matches:
                    raise AudioDownloadError("Downloaded audio file not found.")

                return str(matches[0])

        except yt_dlp.utils.DownloadError as e:
            error_text = str(e)
            error_msg = error_text.lower()
            last_error = error_text

            if _is_retryable_download_error(error_msg) and attempt < max_attempts - 1:
                wait_seconds = 2**attempt
                logger.warning(
                    "[AUDIO] Retry %d/%d for YouTube download after transient error: %s",
                    attempt + 1,
                    max_attempts,
                    error_text,
                )
                logger.info("[AUDIO] Waiting %s seconds before retrying", wait_seconds)
                time.sleep(wait_seconds)
                continue

            if "private" in error_msg or "unavailable" in error_msg:
                raise VideoNotFoundError(
                    f"Video is private, deleted, or unavailable: {e}"
                ) from e

            raise AudioDownloadError(_get_download_error_message(error_text)) from e
        except Exception as e:
            raise AudioDownloadError(f"Failed to download audio: {e}") from e

    # Safety net – normally unreachable because the last attempt raises above.
    raise AudioDownloadError(
        _get_download_error_message(last_error)
        if last_error
        else "The audio download failed after multiple attempts."
    )


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
        0. Reuse an existing cached WAV for this video ID (if present)
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

    # Step 0: Reuse cached WAV if present (download checkpoint)
    cached = get_cached_audio_path(sanitized_id)
    if cached is not None:
        logger.info("[AUDIO] Cached WAV found for %s, skipping download/conversion", video_id)
        return AudioInfo(
            video_id=video_id,
            audio_path=cached,
            duration=await _get_audio_duration(cached),
            file_size=os.path.getsize(cached),
            audio_format="wav",
        )

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


def get_cached_audio_path(video_id: str) -> str | None:
    """Return the path of an existing, non-empty WAV file for a video ID.

    Used as a download checkpoint: if a WAV file already exists in the temp
    directory (e.g. a previous run downloaded and converted it before being
    paused/interrupted), transcription can reuse it instead of re-downloading.

    Returns:
        The WAV path if a valid non-empty file exists, None otherwise.
    """
    if not re.match(r'^[a-zA-Z0-9_-]{11}$', video_id or ""):
        return None
    wav_path = _get_temp_dir() / f"{video_id}.wav"
    try:
        if wav_path.exists() and wav_path.stat().st_size > 1024:
            logger.debug("[AUDIO] Reusing cached WAV: %s", wav_path)
            return str(wav_path)
    except OSError:
        pass
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
