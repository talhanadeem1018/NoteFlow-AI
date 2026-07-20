"""Notes Generator Service – orchestrates note generation from transcripts.

Handles the complete workflow: validation → caching check → AI generation → storage.
Implements caching to avoid redundant AI calls for the same transcript.
"""

import logging
import time
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    AIRateLimitError,
    AIProviderError,
    AITimeoutError,
    AppError,
)
from app.models.note import Note
from app.models.transcript import Transcript
from app.schemas.note import NoteGenerateRequest, NoteGenerateResponse
from app.services.ai.prompt_builder import PromptBuilder
from app.services.ai.service import AIService

logger = logging.getLogger(__name__)


class NotesGeneratorService:
    """Service for generating AI notes from transcripts.

    Implements the complete workflow:
    1. Validate transcript exists and is owned by user
    2. Check for cached notes (unless force_regenerate)
    3. Generate notes using AI
    4. Store notes in database
    5. Return structured response

    Attributes:
        db: Async database session.
        ai_service: AI service instance.
    """

    def __init__(self, db: AsyncSession, ai_service: AIService | None = None):
        """Initialize the notes generator service.

        Args:
            db: Async database session.
            ai_service: Optional pre-configured AI service.
        """
        self.db = db
        self.ai_service = ai_service or AIService()

    async def generate_notes(
        self,
        request: NoteGenerateRequest,
        user_id: str,
    ) -> NoteGenerateResponse:
        """Generate notes for a transcript.

        Args:
            request: Note generation request with transcript_id.
            user_id: Authenticated user's ID.

        Returns:
            NoteGenerateResponse with generated notes.

        Raises:
            AppError: If transcript not found, empty, or unauthorized.
            AIProviderError: If AI generation fails.
            AIRateLimitError: If rate limit exceeded.
            AITimeoutError: If AI request times out.
        """
        start_time = time.time()

        # Parse user ID
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise AppError("Invalid user ID format", status_code=400)

        # Parse transcript ID
        try:
            transcript_uuid = uuid.UUID(request.transcript_id)
        except ValueError:
            raise AppError("Invalid transcript ID format", status_code=400)

        # Step 1: Validate transcript exists and is owned by user
        transcript = await self._validate_transcript(transcript_uuid, user_uuid)

        # Step 2: Check for cached notes (unless force_regenerate)
        if not request.force_regenerate:
            cached_note = await self._get_cached_notes(
                transcript_uuid, user_uuid
            )
            if cached_note:
                logger.info(
                    "Returning cached notes for transcript %s",
                    request.transcript_id,
                )
                processing_time = time.time() - start_time
                return self._build_response(cached_note, processing_time)

        # Step 3: Generate notes using AI
        logger.info(
            "Generating notes for transcript %s (user=%s)",
            request.transcript_id,
            user_id,
        )

        try:
            ai_result = await self.ai_service.generate_notes(
                transcript_text=transcript.full_text,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                custom_instructions=request.custom_instructions,
            )
        except (AIProviderError, AIRateLimitError, AITimeoutError) as e:
            logger.error("AI generation failed: %s", e)
            raise
        except Exception as e:
            logger.error("Unexpected AI error: %s", e)
            raise AIProviderError(f"AI generation failed: {str(e)}") from e

        # Step 4: Store notes in database
        note = await self._store_notes(
            transcript_id=transcript_uuid,
            user_id=user_uuid,
            transcript=transcript,
            ai_result=ai_result,
        )

        # Step 5: Build and return response
        processing_time = time.time() - start_time
        logger.info(
            "Notes generated and stored: note_id=%s, time=%.2fs",
            note.id,
            processing_time,
        )

        return self._build_response(note, processing_time)

    async def get_note(
        self,
        note_id: str,
        user_id: str,
    ) -> NoteGenerateResponse:
        """Get an existing note by ID.

        Args:
            note_id: UUID of the note.
            user_id: Authenticated user's ID.

        Returns:
            NoteGenerateResponse with note data.

        Raises:
            AppError: If note not found or unauthorized.
        """
        try:
            note_uuid = uuid.UUID(note_id)
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise AppError("Invalid ID format", status_code=400)

        result = await self.db.execute(
            select(Note).where(
                Note.id == note_uuid,
                Note.user_id == user_uuid,
            )
        )
        note = result.scalar_one_or_none()

        if not note:
            raise AppError("Note not found", status_code=404)

        return self._build_response(note, 0.0)

    async def list_notes(
        self,
        user_id: str,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[NoteGenerateResponse], int]:
        """List all notes for a user with pagination.

        Args:
            user_id: Authenticated user's ID.
            offset: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            Tuple of (list of NoteGenerateResponse, total count).
        """
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise AppError("Invalid user ID format", status_code=400)

        # Get total count
        count_result = await self.db.execute(
            select(func.count()).select_from(Note).where(
                Note.user_id == user_uuid
            )
        )
        total = count_result.scalar() or 0

        # Get paginated results
        result = await self.db.execute(
            select(Note)
            .where(Note.user_id == user_uuid)
            .order_by(Note.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        notes = result.scalars().all()

        return [self._build_response(n, 0.0) for n in notes], total

    async def delete_note(
        self,
        note_id: str,
        user_id: str,
    ) -> bool:
        """Delete a note if it belongs to the user.

        Args:
            note_id: UUID of the note.
            user_id: Authenticated user's ID.

        Returns:
            True if deleted, False if not found.
        """
        try:
            note_uuid = uuid.UUID(note_id)
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise AppError("Invalid ID format", status_code=400)

        result = await self.db.execute(
            select(Note).where(
                Note.id == note_uuid,
                Note.user_id == user_uuid,
            )
        )
        note = result.scalar_one_or_none()

        if not note:
            return False

        await self.db.delete(note)
        await self.db.commit()
        return True

    async def _validate_transcript(
        self,
        transcript_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Transcript:
        """Validate transcript exists, is owned by user, and is not empty.

        Args:
            transcript_id: Transcript UUID.
            user_id: User UUID.

        Returns:
            The validated Transcript instance.

        Raises:
            AppError: If validation fails.
        """
        result = await self.db.execute(
            select(Transcript).where(
                Transcript.id == transcript_id,
                Transcript.user_id == user_id,
            )
        )
        transcript = result.scalar_one_or_none()

        if not transcript:
            raise AppError("Transcript not found or unauthorized", status_code=404)

        if not transcript.full_text or not transcript.full_text.strip():
            raise AppError("Transcript is empty", status_code=422)

        return transcript

    async def _get_cached_notes(
        self,
        transcript_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Note | None:
        """Check if notes already exist for this transcript.

        Args:
            transcript_id: Transcript UUID.
            user_id: User UUID.

        Returns:
            Existing Note if found, None otherwise.
        """
        # Query directly by transcript_id (proper foreign key lookup)
        result = await self.db.execute(
            select(Note).where(
                Note.transcript_id == transcript_id,
                Note.user_id == user_id,
            ).order_by(Note.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def _store_notes(
        self,
        transcript_id: uuid.UUID,
        user_id: uuid.UUID,
        transcript: Transcript,
        ai_result: dict[str, Any],
    ) -> Note:
        """Store generated notes in the database.

        Args:
            transcript_id: Transcript UUID.
            user_id: User UUID.
            transcript: Transcript instance.
            ai_result: AI generation result.

        Returns:
            Stored Note instance.
        """
        data = ai_result["data"]
        model_used = ai_result.get("model", settings.DEFAULT_LLM_MODEL)
        processing_time = ai_result.get("processing_time", 0.0)

        # Create note with all structured fields populated
        note = Note(
            user_id=user_id,
            transcript_id=transcript_id,
            video_id=transcript.video_id,
            title=data.get("title", "Untitled Notes"),
            content=data.get("detailed_notes", ""),
            note_type="ai_notes",
            ai_provider="openrouter",
            executive_summary=data.get("executive_summary", ""),
            key_concepts=data.get("key_concepts", []),
            detailed_notes=data.get("detailed_notes", ""),
            bullet_points=data.get("bullet_points", []),
            keywords=data.get("keywords", []),
            action_items=data.get("action_items", []),
            conclusion=data.get("conclusion", ""),
            model_used=model_used,
            prompt_version=PromptBuilder.get_prompt_version(),
            processing_time=processing_time,
        )

        self.db.add(note)
        await self.db.flush()
        await self.db.refresh(note)

        logger.info(
            "Stored notes: note_id=%s, transcript_id=%s, user_id=%s",
            note.id,
            transcript_id,
            user_id,
        )

        return note

    def _build_response(
        self,
        note: Note,
        processing_time: float,
    ) -> NoteGenerateResponse:
        """Build API response from Note model.

        Args:
            note: Database note instance.
            processing_time: Processing time in seconds.

        Returns:
            NoteGenerateResponse for API output.
        """
        # Extract structured fields from the note
        # key_concepts, keywords, action_items, bullet_points are stored as JSON (lists)
        key_concepts = note.key_concepts if note.key_concepts else []
        bullet_points = note.bullet_points if note.bullet_points else []
        keywords = note.keywords if note.keywords else []
        action_items = note.action_items if note.action_items else []

        return NoteGenerateResponse(
            id=str(note.id),
            transcript_id=str(note.transcript_id) if note.transcript_id else None,
            user_id=str(note.user_id),
            title=note.title,
            executive_summary=note.executive_summary or "",
            key_concepts=key_concepts if isinstance(key_concepts, list) else [],
            detailed_notes=note.detailed_notes or note.content or "",
            bullet_points=bullet_points if isinstance(bullet_points, list) else [],
            keywords=keywords if isinstance(keywords, list) else [],
            action_items=action_items if isinstance(action_items, list) else [],
            conclusion=note.conclusion or "",
            model_used=note.model_used,
            prompt_version=note.prompt_version,
            processing_time=processing_time or note.processing_time or 0.0,
            created_at=note.created_at,
        )
