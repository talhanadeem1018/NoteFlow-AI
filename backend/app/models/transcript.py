"""Transcript model – stores transcription results from Whisper."""

import uuid

from sqlalchemy import Float, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Transcript(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A transcription of a YouTube video.

    Stores the full transcript text, detected language, timing segments,
    and metadata about the transcription process.
    """

    __tablename__ = "transcripts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    video_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    video_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    full_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    detected_language: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="en",
    )

    language_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    duration: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    segments: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    segment_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    processing_time: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    model_used: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="base",
    )
