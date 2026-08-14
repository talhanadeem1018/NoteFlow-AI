"""Processing schemas – request/response models for background job endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.base import BaseSchema


# ── Request Schemas ─────────────────────────────────────────────

class StartProcessingRequest(BaseModel):
    """Request to start background video processing."""

    url: str = Field(..., description="YouTube video URL")
    language: str | None = Field(None, description="Optional language hint for transcription")
    force_reprocess: bool = Field(False, description="Force re-transcription even if cached")


# ── Response Schemas ────────────────────────────────────────────

class ProcessingJobResponse(BaseSchema):
    """Response returned immediately after starting a processing job."""

    job_id: str = Field(..., description="UUID of the background processing job")
    status: str = Field("pending", description="Current job status")
    progress_message: str | None = Field(None, description="Human-readable progress")
    created_at: datetime = Field(..., description="When the job was created")


class ProcessingStatusResponse(BaseSchema):
    """Polling response for job status.

    status values:
        pending / processing / completed / failed (existing lifecycle)
        paused / cancelled / interrupted (control states, added for pause/resume)

    current_stage is the persisted pipeline checkpoint:
        metadata → downloading → transcribing → generating_notes → completed.
    progress is a 0-100 integer derived from current_stage so clients can
    render an accurate progress bar without guessing.
    """

    job_id: str = Field(..., description="UUID of the processing job")
    status: str = Field(..., description="Current job status (pending|processing|completed|failed|paused|cancelled|interrupted)")
    current_stage: str | None = Field(None, description="Persisted pipeline checkpoint (metadata|downloading|transcribing|generating_notes|completed)")
    progress: int = Field(0, description="Computed progress percentage 0-100")
    progress_message: str | None = Field(None, description="Human-readable progress step")
    transcript_id: str | None = Field(None, description="Transcript ID (set when completed)")
    note_id: str | None = Field(None, description="Note ID (set when completed)")
    error_message: str | None = Field(None, description="Error detail if failed")
    paused_at: datetime | None = Field(None, description="When the job was paused")
    cancelled_at: datetime | None = Field(None, description="When the job was cancelled")
    interrupted_at: datetime | None = Field(None, description="When the job was interrupted")
    created_at: datetime = Field(..., description="When the job was created")
    completed_at: datetime | None = Field(None, description="When processing finished")
