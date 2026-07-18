"""Note-related Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class NoteCreate(BaseSchema):
    """Request schema for creating a note."""

    title: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Note title",
    )
    content: str = Field(default="", description="Note content (markdown)")
    video_id: str | None = Field(None, description="Associated YouTube video ID")
    note_type: str = Field(
        default="notes",
        description="Note type: summary | notes | quiz | flashcards",
    )
    ai_provider: str | None = Field(None, description="AI provider used to generate")


class NoteUpdate(BaseSchema):
    """Request schema for updating a note (all fields optional)."""

    title: str | None = Field(None, min_length=1, max_length=500)
    content: str | None = None
    note_type: str | None = None


class NoteRead(BaseSchema):
    """Response schema for a single note."""

    id: uuid.UUID
    user_id: uuid.UUID
    video_id: str | None = None
    title: str
    content: str
    note_type: str
    ai_provider: str | None = None
    created_at: datetime
    updated_at: datetime


class NoteListResponse(BaseSchema):
    """Paginated list of notes."""

    data: list[NoteRead]
    total: int
