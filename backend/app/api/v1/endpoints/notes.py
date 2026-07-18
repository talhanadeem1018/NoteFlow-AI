"""Note endpoints – CRUD operations scoped to the authenticated user."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.schemas.auth import AuthUser
from app.schemas.note import NoteCreate, NoteListResponse, NoteRead, NoteUpdate
from app.services.note import (
    create_note,
    delete_note,
    get_note_by_id,
    list_notes,
    update_note,
)

router = APIRouter()


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
    """Return all notes belonging to the authenticated user."""
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
    """Return a single note if it belongs to the authenticated user."""
    user_uuid = uuid.UUID(user.id)
    note = await get_note_by_id(db, note_id, user_uuid)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
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
