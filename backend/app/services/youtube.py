"""YouTube video metadata extraction service using yt-dlp."""

import asyncio
import re
from typing import Any

import yt_dlp

from app.core.config import settings
from app.core.exceptions import (
    InvalidURLError,
    VideoNotFoundError,
    VideoProcessingError,
)
from app.schemas.video import VideoMetadata

# Regex patterns for YouTube URL validation
_YT_PATTERNS = [
    r"(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
    r"(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})",
    r"(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]{11})",
    r"(?:https?://)?(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})",
    r"(?:https?://)?(?:www\.)?youtube\.com/v/([a-zA-Z0-9_-]{11})",
]


def extract_video_id(url: str) -> str | None:
    """Extract the 11-character video ID from various YouTube URL formats."""
    for pattern in _YT_PATTERNS:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def _format_duration(seconds: int | None) -> int | None:
    """Ensure duration is a positive integer or None."""
    if seconds is None or seconds <= 0:
        return None
    return seconds


async def fetch_video_metadata(url: str) -> VideoMetadata:
    """
    Fetch video metadata from YouTube using yt-dlp.

    Does NOT download the video – only extracts metadata.
    Raises InvalidURLError, VideoNotFoundError, or VideoProcessingError.
    """
    # Validate URL format first
    video_id = extract_video_id(url)
    if not video_id:
        raise InvalidURLError(
            f"Invalid YouTube URL: could not extract video ID from '{url}'"
        )

    # yt-dlp options: metadata only, no download
    ydl_opts: dict[str, Any] = {
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "socket_timeout": 15,
    }

    try:
        # Run synchronous yt-dlp in a thread to avoid blocking the event loop
        def _extract() -> dict | None:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)

        info = await asyncio.to_thread(_extract)
    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e).lower()
        if "private" in error_msg or "unavailable" in error_msg or "not found" in error_msg:
            raise VideoNotFoundError(
                f"Video is private, deleted, or unavailable: {e}"
            ) from e
        raise VideoProcessingError(f"yt-dlp error: {e}") from e
    except Exception as e:
        raise VideoProcessingError(
            f"Unexpected error fetching video metadata: {e}"
        ) from e

    if info is None:
        raise VideoNotFoundError("No metadata returned for this video")

    # Build structured response
    return VideoMetadata(
        video_id=info.get("id", video_id),
        title=info.get("title", "Unknown Title"),
        channel=info.get("channel", info.get("uploader", "Unknown Channel")),
        duration=_format_duration(info.get("duration")),
        thumbnail_url=info.get("thumbnail"),
        description=info.get("description"),
        upload_date=info.get("upload_date"),
        view_count=info.get("view_count"),
        tags=info.get("tags", []) or [],
    )
