"""Note endpoints – CRUD operations and AI notes generation.

Endpoints:
- POST   /api/v1/notes/generate  → Generate AI notes from transcript
- GET    /api/v1/notes/{id}      → Get a single note (AI or manual)
- GET    /api/v1/notes           → List notes for authenticated user
- DELETE /api/v1/notes/{id}      → Delete a note
"""

import time
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.schemas.auth import AuthUser
from app.schemas.note import (
    NoteCreate,
    NoteGenerateRequest,
    NoteGenerateResponse,
    NoteListResponse,
    NoteRead,
    NoteUpdate,
)
from app.services.ai.notes_generator import NotesGeneratorService
from app.services.note import (
    create_note,
    delete_note,
    get_note_by_id,
    list_notes,
    update_note,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ── AI Notes Generation ──────────────────────────────────────────
@router.post(
    "/generate",
    response_model=NoteGenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate AI notes from a transcript",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Transcript not found"},
        422: {"description": "Invalid request or empty transcript"},
        429: {"description": "Rate limit exceeded"},
        504: {"description": "AI request timed out"},
    },
)
async def generate_notes(
    body: NoteGenerateRequest,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteGenerateResponse:
    """Generate structured AI notes from a transcript.

    This endpoint:
    1. Validates the transcript exists and is owned by the user
    2. Checks for cached notes (unless force_regenerate=true)
    3. Generates notes using OpenRouter AI
    4. Stores and returns the generated notes
    """
    from app.core.exceptions import (
        AIRateLimitError,
        AIProviderError,
        AITimeoutError,
        AppError,
    )

    logger.info("[TIMING] Step 1: Receive request — transcript_id=%s", body.transcript_id)
    step_start = time.time()

    generator = NotesGeneratorService(db)
    try:
        response = await generator.generate_notes(body, user.id)
        logger.info("[TIMING] Step 8: Return response — total_elapsed=%.2fs", time.time() - step_start)
        return response
    except AppError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.detail,
        )
    except (AIProviderError, AIRateLimitError, AITimeoutError) as e:
        logger.error("AI generation failed: %s", e)
        raise HTTPException(
            status_code=e.status_code,
            detail=e.detail,
        )
    except Exception as e:
        logger.error("Unexpected error during note generation: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate notes: {str(e)}",
        )
    finally:
        # Ensure the OpenRouter HTTP client is closed to free connections
        await generator.ai_service.close()


# ── CRUD Endpoints (work for both manual and AI notes) ───────────
@router.get(
    "",
    response_model=NoteListResponse,
    summary="List notes for the authenticated user",
    responses={
        401: {"description": "Authentication required"},
    },
)
async def list(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteListResponse:
    """Return all notes (manual and AI-generated) belonging to the authenticated user."""
    user_uuid = uuid.UUID(user.id)
    notes, total = await list_notes(db, user_uuid, offset=offset, limit=limit)
    return NoteListResponse(
        data=[NoteRead.model_validate(n) for n in notes],
        total=total,
    )


@router.get(
    "/{note_id}",
    response_model=NoteRead,
    summary="Get a single note",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Note not found"},
    },
)
async def get(
    note_id: uuid.UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteRead:
    """Return a single note (AI-generated or manual) if it belongs to the authenticated user."""
    user_uuid = uuid.UUID(user.id)
    note = await get_note_by_id(db, note_id, user_uuid)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    return NoteRead.model_validate(note)


@router.post(
    "",
    response_model=NoteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new note",
    responses={
        401: {"description": "Authentication required"},
    },
)
async def create(
    body: NoteCreate,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteRead:
    """Create a note owned by the authenticated user."""
    user_uuid = uuid.UUID(user.id)
    note = await create_note(db, user_uuid, body)
    return NoteRead.model_validate(note)


@router.patch(
    "/{note_id}",
    response_model=NoteRead,
    summary="Update a note",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Note not found"},
    },
)
async def update(
    note_id: uuid.UUID,
    body: NoteUpdate,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteRead:
    """Update a note if it belongs to the authenticated user."""
    user_uuid = uuid.UUID(user.id)
    note = await update_note(db, note_id, user_uuid, body)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    return NoteRead.model_validate(note)


@router.delete(
    "/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a note",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Note not found"},
    },
)
async def delete(
    note_id: uuid.UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a note if it belongs to the authenticated user."""
    user_uuid = uuid.UUID(user.id)
    deleted = await delete_note(db, note_id, user_uuid)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
