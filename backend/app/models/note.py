"""Note model – associates notes with authenticated users."""

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Note(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A note belonging to an authenticated user.

    The ``user_id`` column references the Supabase Auth UID stored in the
    ``users`` table.  Row-Level Security (RLS) on Supabase can additionally
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

    # ── Relationships ──────────────────────────────────────────────
    user = relationship("User", back_populates="notes", lazy="selectin")
