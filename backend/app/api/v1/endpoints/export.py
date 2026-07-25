"""Export endpoints – download notes as PDF or DOCX.

Endpoints:
- GET /api/v1/notes/{note_id}/export/pdf   → Download PDF
- GET /api/v1/notes/{note_id}/export/docx  → Download DOCX

These endpoints reuse the existing ``get_note_by_id`` service for
authentication and ownership checks, and the export service for file
generation. No note data is modified.
"""

from __future__ import annotations

import asyncio
import io
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.schemas.auth import AuthUser
from app.services.note import get_note_by_id
from app.services.export_service import generate_pdf, generate_docx

logger = logging.getLogger(__name__)

router = APIRouter()


def _sanitise_filename(title: str) -> str:
    """Return a filesystem-safe version of *title* for Content-Disposition."""
    safe = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in title)
    return safe.strip() or "notes"


@router.get(
    "/{note_id}/export/pdf",
    summary="Export a note as PDF",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Note not found"},
    },
)
async def export_pdf(
    note_id: uuid.UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Download a PDF version of the requested note."""
    user_uuid = uuid.UUID(user.id)
    note = await get_note_by_id(db, note_id, user_uuid)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    try:
        pdf_buffer = await _run_generate_pdf(note)
        filename = _sanitise_filename(note.title)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}.pdf"',
                "Content-Type": "application/pdf",
            },
        )
    except Exception as e:
        logger.error("PDF export failed for note %s: %s", note_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF export. Please try again later.",
        )


@router.get(
    "/{note_id}/export/docx",
    summary="Export a note as DOCX",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Note not found"},
    },
)
async def export_docx(
    note_id: uuid.UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Download a Word (.docx) version of the requested note."""
    user_uuid = uuid.UUID(user.id)
    note = await get_note_by_id(db, note_id, user_uuid)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    try:
        docx_buffer = await _run_generate_docx(note)
        filename = _sanitise_filename(note.title)
        return StreamingResponse(
            docx_buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}.docx"',
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
        )
    except Exception as e:
        logger.error("DOCX export failed for note %s: %s", note_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate DOCX export. Please try again later.",
        )


# -─ Synchronous wrappers (run in thread pool to avoid blocking the event loop) ─

async def _run_generate_pdf(note) -> io.BytesIO:
    """Run PDF generation in a thread pool executor."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, generate_pdf, note)


async def _run_generate_docx(note) -> io.BytesIO:
    """Run DOCX generation in a thread pool executor."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, generate_docx, note)
