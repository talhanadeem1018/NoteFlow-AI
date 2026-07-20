"""Note model – associates notes with authenticated users."""

import uuid

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Note(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A note belonging to an authenticated user.

    Supports both manually created notes and AI-generated notes with
    structured fields for executive summary, key concepts, etc.

    The ``user_id`` column references the Supabase Auth UID stored in the
    ``users`` table. Row-Level Security (RLS) on Supabase can additionally
    enforce ownership at the database level.
    """

    __tablename__ = "notes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    video_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    note_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="notes", index=True
    )
    ai_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── AI-Generated Notes Fields ───────────────────────────────
    transcript_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transcripts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    executive_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_concepts: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    detailed_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    bullet_points: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    keywords: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    action_items: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    processing_time: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ── Relationships ──────────────────────────────────────────────
    user = relationship("User", back_populates="notes", lazy="selectin")
    transcript = relationship("Transcript", backref="notes", lazy="selectin")
