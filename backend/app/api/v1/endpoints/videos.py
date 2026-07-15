"""Video metadata endpoint – extracts YouTube video info via yt-dlp."""

from fastapi import APIRouter

from app.core.exceptions import AppError
from app.schemas.video import VideoMetadataResponse, VideoURLRequest
from app.services.youtube import fetch_video_metadata

router = APIRouter()


@router.post(
    "/metadata",
    response_model=VideoMetadataResponse,
    summary="Extract video metadata",
    description="Paste a YouTube URL and receive structured metadata without downloading the video.",
    responses={
        404: {"description": "Video not found, private, or unavailable"},
        422: {"description": "Invalid YouTube URL"},
        500: {"description": "Internal processing error"},
    },
)
async def get_video_metadata(body: VideoURLRequest) -> VideoMetadataResponse:
    """Fetch metadata for a YouTube video by URL."""
    metadata = await fetch_video_metadata(body.url)
    return VideoMetadataResponse(data=metadata)
