"""Note service – CRUD operations scoped to the authenticated user."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.note import Note
from app.schemas.note import NoteCreate, NoteUpdate


async def create_note(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: NoteCreate,
) -> Note:
    """Create a new note owned by *user_id*."""
    note = Note(
        user_id=user_id,
        title=payload.title,
        content=payload.content,
        video_id=payload.video_id,
        note_type=payload.note_type,
        ai_provider=payload.ai_provider,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def list_notes(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Note], int]:
    """Return notes belonging to *user_id* with pagination."""
    total = await db.scalar(
        select(func.count()).where(Note.user_id == user_id).select_from(Note)
    )
    result = await db.execute(
        select(Note)
        .where(Note.user_id == user_id)
        .order_by(Note.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all()), total or 0


async def get_note_by_id(
    db: AsyncSession,
    note_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Note | None:
    """Return a single note if it belongs to *user_id*, else ``None``."""
    result = await db.execute(
        select(Note)
        .where(Note.id == note_id, Note.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_note(
    db: AsyncSession,
    note_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: NoteUpdate,
) -> Note | None:
    """Update a note if it belongs to *user_id*."""
    note = await get_note_by_id(db, note_id, user_id)
    if note is None:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(note, field, value)

    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(
    db: AsyncSession,
    note_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    """Delete a note if it belongs to *user_id*. Returns ``True`` on success."""
    note = await get_note_by_id(db, note_id, user_id)
    if note is None:
        return False

    await db.delete(note)
    await db.commit()
    return True
