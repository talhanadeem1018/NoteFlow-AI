"""Video-related Pydantic schemas."""

from pydantic import BaseModel, Field

from app.schemas.base import BaseSchema


class VideoURLRequest(BaseSchema):
    """Request schema for fetching video metadata."""

    url: str = Field(
        ...,
        description="YouTube video URL",
        examples=["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
        min_length=11,
        max_length=500,
    )


class VideoMetadata(BaseSchema):
    """Response schema for video metadata."""

    video_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    channel: str = Field(..., description="Channel name")
    duration: int | None = Field(None, description="Duration in seconds")
    thumbnail_url: str | None = Field(None, description="Thumbnail URL")
    description: str | None = Field(None, description="Video description")
    upload_date: str | None = Field(None, description="Upload date (YYYYMMDD)")
    view_count: int | None = Field(None, description="Total view count")
    tags: list[str] = Field(default_factory=list, description="Video tags")


class VideoMetadataResponse(BaseSchema):
    """Wrapper response for video metadata."""

    data: VideoMetadata
    message: str = "Video metadata fetched successfully"


class AudioInfo(BaseSchema):
    """Information about the downloaded audio file."""

    video_id: str = Field(..., description="YouTube video ID")
    audio_path: str = Field(..., description="Path to the converted audio file")
    duration: int | None = Field(None, description="Audio duration in seconds")
    file_size: int = Field(..., description="File size in bytes")
    audio_format: str = Field(..., description="Audio format (e.g. wav, mp3)")


class AudioResponse(BaseSchema):
    """Wrapper response for audio download."""

    data: AudioInfo
    message: str = "Audio downloaded and converted successfully"
