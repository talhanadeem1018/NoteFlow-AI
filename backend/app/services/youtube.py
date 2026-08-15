"""YouTube video metadata extraction service using yt-dlp."""

import asyncio
import logging
import re
from pathlib import Path
from typing import Any

import yt_dlp

from app.core.config import settings
from app.core.exceptions import (
    InvalidURLError,
    VideoNotFoundError,
    VideoProcessingError,
)
from app.schemas.video import VideoMetadata

logger = logging.getLogger(__name__)

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


#: User-facing message for YouTube's anti-bot verification challenge. Kept
#: free of cookie/browser instructions – SaaS users must never configure
#: anything on their own devices.
BOT_CHECK_ERROR_MESSAGE = (
    "YouTube is temporarily blocking automated video access. "
    "Please try again in a few minutes."
)


def is_bot_check_error(error_message: str) -> bool:
    """Return True when yt-dlp hit YouTube's anti-bot verification check."""
    normalized = error_message.lower()
    return (
        "sign in to confirm you're not a bot" in normalized
        or "captcha" in normalized
    )


def build_ytdlp_options(
    *,
    download: bool = False,
    output_path: str | None = None,
    socket_timeout: int = 30,
) -> dict[str, Any]:
    """Build shared yt-dlp options hardened for server-side extraction.

    Designed for a multi-user SaaS where end users must NOT log into
    browsers, export cookies, or configure anything on their own devices.
    No browser cookies are ever read (yt-dlp's `cookiesfrombrowser` is
    useless on a headless server anyway and is the source of the
    "Could not copy Chrome cookie database" failure).

    Hardening (all operator-level, all optional):
      - Player-client fallback chain: multiple YouTube player clients are
        tried in order (android first). The default `web` client increasingly
        demands PO tokens / a signed-in session on flagged datacenter IPs;
        mobile/TV clients are challenged far less often and bypass the
        "Sign in to confirm you're not a bot" check without any cookies.
      - YTDLP_PROXY: optional egress proxy so operators can escape
        bot-flagged datacenter IPs.
      - YTDLP_COOKIES_FILE: optional OPERATOR-provided cookies.txt for edge
        cases that still require a signed-in session. Never user-supplied.
    """
    player_clients = [
        client.strip()
        for client in settings.YTDLP_PLAYER_CLIENTS.split(",")
        if client.strip()
    ] or ["android"]

    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": socket_timeout,
        "retries": 0,
        "noplaylist": True,
        "extractor_args": {
            "youtube": {
                "player_client": player_clients,
            },
        },
    }

    if settings.YTDLP_PROXY:
        opts["proxy"] = settings.YTDLP_PROXY

    if settings.YTDLP_COOKIES_FILE:
        cookies_path = Path(settings.YTDLP_COOKIES_FILE)
        if cookies_path.is_file():
            opts["cookiefile"] = str(cookies_path)
        else:
            logger.warning(
                "[YOUTUBE] YTDLP_COOKIES_FILE is set but no file found at %s",
                cookies_path,
            )

    if download and output_path:
        opts["format"] = "bestaudio/best"
        opts["outtmpl"] = output_path
    else:
        opts["skip_download"] = True
        opts["extract_flat"] = False

    return opts


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

    # yt-dlp options: metadata only, no download (hardened – see
    # build_ytdlp_options for the player-client fallback strategy).
    ydl_opts = build_ytdlp_options(socket_timeout=15)

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
        if is_bot_check_error(str(e)):
            raise VideoProcessingError(BOT_CHECK_ERROR_MESSAGE) from e
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
