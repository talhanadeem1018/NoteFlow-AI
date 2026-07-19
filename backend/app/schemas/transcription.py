"""Transcription-related Pydantic schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import Field

from app.schemas.base import BaseSchema


class TranscriptionRequest(BaseSchema):
    """Request schema for starting a transcription."""

    url: str = Field(
        ...,
        description="YouTube video URL",
        examples=["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    )
    language: Optional[str] = Field(
        None,
        description="ISO 639-1 language code (e.g., 'en', 'es'). None for auto-detect.",
        min_length=2,
        max_length=5,
    )
    beam_size: Optional[int] = Field(
        None,
        ge=1,
        le=10,
        description="Beam search size. Higher = better quality, slower. Default from config.",
    )
    vad_filter: Optional[bool] = Field(
        None,
        description="Enable Voice Activity Detection to skip silence. Default from config.",
    )
    force_reprocess: bool = Field(
        False,
        description="Force reprocessing even if transcript exists.",
    )


class TranscriptSegmentResponse(BaseSchema):
    """Response schema for a single transcription segment."""

    id: int = Field(..., description="Segment index")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    text: str = Field(..., description="Transcribed text for this segment")
    avg_logprob: Optional[float] = Field(None, description="Average log probability")
    no_speech_prob: Optional[float] = Field(None, description="No-speech probability")
    compression_ratio: Optional[float] = Field(None, description="Compression ratio")


class TranscriptionResponse(BaseSchema):
    """Response schema for a completed transcription."""

    id: str = Field(..., description="Transcript UUID")
    video_id: str = Field(..., description="YouTube video ID")
    video_url: str = Field(..., description="Original YouTube URL")
    full_text: str = Field(..., description="Complete transcribed text")
    detected_language: str = Field(..., description="Detected language code")
    language_probability: float = Field(..., description="Language detection confidence")
    duration: float = Field(..., description="Audio duration in seconds")
    segments: List[TranscriptSegmentResponse] = Field(
        default_factory=list,
        description="Timestamped transcription segments",
    )
    segment_count: int = Field(..., description="Number of segments")
    processing_time: float = Field(..., description="Transcription processing time in seconds")
    model_used: str = Field(..., description="Whisper model used")
    created_at: datetime = Field(..., description="Transcription creation timestamp")


class TranscriptionStatus(BaseSchema):
    """Response schema for transcription status check."""

    exists: bool = Field(..., description="Whether a transcript exists")
    transcript_id: Optional[str] = Field(None, description="Existing transcript UUID")
    created_at: Optional[datetime] = Field(None, description="When the transcript was created")
    language: Optional[str] = Field(None, description="Detected language")
    duration: Optional[float] = Field(None, description="Audio duration in seconds")


class TranscriptListResponse(BaseSchema):
    """Paginated list of transcripts."""

    data: List[TranscriptionResponse]
    total: int
    skip: int
    limit: int


# Rebuild models to resolve forward references for Pydantic v2
TranscriptionResponse.model_rebuild()
TranscriptListResponse.model_rebuild()
