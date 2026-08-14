"""ProcessingJob model – tracks async video processing jobs."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ProcessingJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Tracks the state of a background video processing job.

    When a user submits a YouTube URL, a ProcessingJob is created immediately
    with status='pending'. The actual processing (download → transcribe → AI notes)
    runs in a background asyncio task. The frontend polls this table for status
    updates until the job completes, fails, or is paused/cancelled/interrupted.

    Lifecycle statuses:
        pending       – created, waiting for a concurrency slot (≈ "queued")
        processing    – worker is actively running the pipeline
        completed     – notes are generated and stored
        failed        – an unrecoverable error occurred
        paused        – user paused the job; resumable from its checkpoint
        cancelled     – user cancelled the job; terminal, progress discarded
        interrupted   – the worker died unexpectedly (server restart, crash); resumable

    Checkpointing:
        current_stage tracks which pipeline stage is executing
        (metadata → downloading → transcribing → generating_notes → completed).
        Together with the persisted artifact IDs (video_metadata, transcript_id,
        note_id) and the cached WAV file, this lets resume() continue from the
        latest completed stage instead of restarting the pipeline.

    Columns:
        user_id: Supabase Auth UID of the user who submitted the job.
        video_url: Original YouTube URL to process.
        status: One of the lifecycle statuses above.
        current_stage: Latest pipeline stage (checkpoint for resume).
        video_metadata: JSON blob of fetched video metadata (stored after metadata step).
        transcript_id: FK to transcripts table (set when transcription completes).
        note_id: FK to notes table (set when AI notes generation completes).
        error_message: Human-readable error description if the job failed.
        progress_message: Human-readable current step (e.g. "Downloading audio...").
        paused_at / cancelled_at / interrupted_at: When the job entered those states.
        language: Language hint used for transcription (persisted for resume).
        force_reprocess: Whether to bypass transcript/note caches (persisted for resume).
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

    # ── Checkpoint / progress tracking ────────────────────────────
    current_stage: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
        default=None,
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

    # ── Control timestamps ─────────────────────────────────────────
    paused_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    interrupted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ── Resume metadata ────────────────────────────────────────────
    language: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
    )

    force_reprocess: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
