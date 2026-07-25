"""ProcessingJob model – tracks async video processing jobs."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ProcessingJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Tracks the state of a background video processing job.

    When a user submits a YouTube URL, a ProcessingJob is created immediately
    with status='pending'. The actual processing (download → transcribe → AI notes)
    runs in a background asyncio task. The frontend polls this table for status
    updates until the job completes or fails.

    Columns:
        user_id: Supabase Auth UID of the user who submitted the job.
        video_url: Original YouTube URL to process.
        status: One of 'pending', 'processing', 'completed', 'failed'.
        video_metadata: JSON blob of fetched video metadata (stored after metadata step).
        transcript_id: FK to transcripts table (set when transcription completes).
        note_id: FK to notes table (set when AI notes generation completes).
        error_message: Human-readable error description if the job failed.
        progress_message: Human-readable current step (e.g. "Downloading audio...").
    """

    __tablename__ = "processing_jobs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    video_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
    )

    video_metadata: Mapped[str | None] = mapped_column(
        type_=String(2000),
        nullable=True,
    )

    transcript_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    note_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    progress_message: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        default="Starting...",
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
