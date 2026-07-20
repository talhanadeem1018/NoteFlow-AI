"""Note-related Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


# ── Legacy Schemas (kept for backward compatibility) ─────────────
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
    """Response schema for a single note.
    
    Includes both manual and AI-generated note fields.
    AI-specific fields are populated only for AI-generated notes.
    """

    id: uuid.UUID
    user_id: uuid.UUID
    video_id: str | None = None
    title: str
    content: str
    note_type: str
    ai_provider: str | None = None
    
    # ── AI-Generated Note Fields (populated when note_type == "ai_notes")
    transcript_id: uuid.UUID | None = None
    executive_summary: str | None = None
    key_concepts: list[str] | None = None
    detailed_notes: str | None = None
    bullet_points: list[str] | None = None
    keywords: list[str] | None = None
    action_items: list[str] | None = None
    conclusion: str | None = None
    model_used: str | None = None
    prompt_version: str | None = None
    processing_time: float | None = None
    
    created_at: datetime
    updated_at: datetime


class NoteListResponse(BaseSchema):
    """Paginated list of notes."""

    data: list[NoteRead]
    total: int


# ── AI Notes Generation Schemas ──────────────────────────────────
class NoteGenerateRequest(BaseSchema):
    """Request schema for generating AI notes from a transcript."""

    transcript_id: str = Field(
        ...,
        description="UUID of the transcript to generate notes from",
    )
    force_regenerate: bool = Field(
        default=False,
        description="Force regeneration even if notes already exist",
    )
    model: str | None = Field(
        default=None,
        description="Optional model override (e.g., 'gpt-4o', 'claude-3-opus')",
    )
    temperature: float = Field(
        default=0.3,
        ge=0.0,
        le=2.0,
        description="Sampling temperature (lower = more deterministic)",
    )
    max_tokens: int = Field(
        default=4096,
        ge=100,
        le=16000,
        description="Maximum tokens to generate",
    )
    custom_instructions: str | None = Field(
        default=None,
        description="Optional additional instructions for the AI",
    )


class NoteGenerateResponse(BaseSchema):
    """Response schema for AI-generated notes."""

    id: str = Field(..., description="Generated note ID")
    transcript_id: str | None = Field(None, description="Source transcript ID")
    user_id: str = Field(..., description="User ID")
    title: str = Field(..., description="Generated note title")
    executive_summary: str = Field(default="", description="Executive summary")
    key_concepts: list[str] = Field(default_factory=list, description="Key concepts")
    detailed_notes: str = Field(default="", description="Detailed notes (markdown)")
    bullet_points: list[str] = Field(default_factory=list, description="Bullet points")
    keywords: list[str] = Field(default_factory=list, description="Keywords")
    action_items: list[str] = Field(default_factory=list, description="Action items")
    conclusion: str = Field(default="", description="Conclusion")
    model_used: str | None = Field(None, description="AI model used")
    prompt_version: str | None = Field(None, description="Prompt version")
    processing_time: float = Field(default=0.0, description="Processing time in seconds")
    created_at: datetime = Field(..., description="Creation timestamp")


class NoteListAIResponse(BaseSchema):
    """Paginated list of AI-generated notes."""

    data: list[NoteGenerateResponse]
    total: int


class NoteDeleteResponse(BaseSchema):
    """Response for note deletion."""

    message: str
    success: bool = True
