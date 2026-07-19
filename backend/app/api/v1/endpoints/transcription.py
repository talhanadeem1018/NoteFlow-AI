"""Transcription endpoints – Whisper transcription pipeline."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.schemas.auth import AuthUser
from app.schemas.transcription import (
    TranscriptListResponse,
    TranscriptionRequest,
    TranscriptionResponse,
    TranscriptionStatus,
)
from app.services.transcription.transcription_service import TranscriptionService

router = APIRouter()


def _get_transcription_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TranscriptionService:
    """Dependency injection for TranscriptionService."""
    return TranscriptionService(db)


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    summary="Start transcription",
    description=(
        "Transcribe a YouTube video using Whisper. Downloads audio, "
        "runs transcription, and stores the result. Returns cached transcript "
        "if available (unless force_reprocess=True)."
    ),
    responses={
        404: {"description": "Video not found or unavailable"},
        422: {"description": "Invalid YouTube URL"},
        500: {"description": "Transcription failed"},
    },
)
async def start_transcription(
    body: TranscriptionRequest,
    user: Annotated[AuthUser, Depends(get_current_user)],
    service: Annotated[TranscriptionService, Depends(_get_transcription_service)],
) -> TranscriptionResponse:
    """Start transcribing a YouTube video.

    This endpoint:
    1. Validates the YouTube URL
    2. Downloads and converts audio to WAV
    3. Runs Whisper transcription
    4. Stores the transcript in the database
    5. Returns the complete transcription result
    """
    return await service.start_transcription(body, user.id)


@router.get(
    "/transcripts/{transcript_id}",
    response_model=TranscriptionResponse,
    summary="Get transcript",
    description="Retrieve an existing transcription by its ID.",
    responses={
        404: {"description": "Transcript not found"},
    },
)
async def get_transcript(
    transcript_id: str,
    user: Annotated[AuthUser, Depends(get_current_user)],
    service: Annotated[TranscriptionService, Depends(_get_transcription_service)],
) -> TranscriptionResponse:
    """Get a specific transcript by ID."""
    return await service.get_transcript(transcript_id, user.id)


@router.get(
    "/transcripts",
    response_model=TranscriptListResponse,
    summary="List user transcripts",
    description="List all transcripts for the authenticated user with pagination.",
)
async def list_transcripts(
    user: Annotated[AuthUser, Depends(get_current_user)],
    service: Annotated[TranscriptionService, Depends(_get_transcription_service)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> TranscriptListResponse:
    """List all transcripts for the current user."""
    transcripts, total = await service.list_user_transcripts(user.id, skip=skip, limit=limit)
    return TranscriptListResponse(
        data=transcripts,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/transcription-status",
    response_model=TranscriptionStatus,
    summary="Check transcription status",
    description="Check if a transcript already exists for a given YouTube video.",
)
async def get_transcription_status(
    url: str,
    user: Annotated[AuthUser, Depends(get_current_user)],
    service: Annotated[TranscriptionService, Depends(_get_transcription_service)],
) -> TranscriptionStatus:
    """Check transcription status for a video URL."""
    return await service.get_transcription_status(url, user.id)


@router.get(
    "/whisper-info",
    summary="Get Whisper model info",
    description="Get current Whisper model configuration and status.",
)
async def get_whisper_info() -> dict:
    """Get Whisper model information."""
    from app.services.transcription.whisper_service import whisper_service

    return whisper_service.get_model_info()
