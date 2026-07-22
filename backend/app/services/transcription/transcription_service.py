"""Transcription orchestration service.

Handles the end-to-end workflow: YouTube URL → Audio Download → Whisper Transcription → Store Transcript.
Integrates with existing audio download service and Whisper transcription service.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    AppError,
    AudioDownloadError,
    InvalidURLError,
    TranscriptionError,
    VideoNotFoundError,
)
from app.models.transcript import Transcript
from app.schemas.transcription import (
    TranscriptionRequest,
    TranscriptionResponse,
    TranscriptionStatus,
    TranscriptSegmentResponse,
)
from app.services.audio import cleanup_audio_file, download_and_convert_audio
from app.services.youtube import extract_video_id
from app.services.transcription.whisper_service import (
    TranscriptionResult,
    whisper_service,
)

logger = logging.getLogger(__name__)


class TranscriptionService:
    """Service for orchestrating the full transcription pipeline.

    Flow:
        1. Validate YouTube URL
        2. Download & convert audio (if not cached)
        3. Transcribe with Whisper
        4. Store transcript in database
        5. Return structured result
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def start_transcription(
        self,
        request: TranscriptionRequest,
        user_id: str,
    ) -> TranscriptionResponse:
        """Start a transcription job for a YouTube video.

        Args:
            request: Transcription request with YouTube URL and options.
            user_id: Authenticated user's ID.

        Returns:
            TranscriptionResponse with transcript data or status.

        Raises:
            InvalidURLError: If YouTube URL is invalid.
            VideoNotFoundError: If video is unavailable.
            TranscriptionError: If transcription fails.
        """
        try:
            # Step 1: Check for existing transcript
            logger.info("[TRANSCRIBE] Step 1: Checking for existing transcript...")
            existing = await self._get_existing_transcript(
                request.url, user_id
            )
            if existing and not request.force_reprocess:
                logger.info("[TRANSCRIBE] Returning cached transcript for %s", request.url)
                return existing
            logger.info("[TRANSCRIBE] No existing transcript found, proceeding...")

            # Step 2: Download and convert audio
            logger.info("[TRANSCRIBE] Step 2: Downloading audio for %s", request.url)
            audio_info = await download_and_convert_audio(request.url)
            logger.info("[TRANSCRIBE] Step 2 complete: audio_path=%s, video_id=%s",
                       audio_info.audio_path, audio_info.video_id)

            # Step 3: Transcribe with Whisper
            logger.info("[TRANSCRIBE] Step 3: Starting Whisper transcription for %s", audio_info.audio_path)
            transcription_result = await whisper_service.transcribe(
                audio_path=audio_info.audio_path,
                language=request.language,
                beam_size=request.beam_size,
                vad_filter=request.vad_filter,
            )
            logger.info("[TRANSCRIBE] Step 3 complete: %d segments, %.1fs audio",
                       len(transcription_result.segments), transcription_result.duration)

            # Step 4: Store in database
            logger.info("[TRANSCRIBE] Step 4: Storing transcript in database...")
            transcript = await self._store_transcript(
                video_url=request.url,
                video_id=audio_info.video_id,
                user_id=user_id,
                result=transcription_result,
            )
            logger.info("[TRANSCRIBE] Step 4 complete: transcript_id=%s", transcript.id)

            # Step 5: Clean up audio file
            logger.info("[TRANSCRIBE] Step 5: Cleaning up audio file...")
            cleanup_audio_file(audio_info.video_id)

            # Step 6: Build and return response
            logger.info("[TRANSCRIBE] Step 6: Building final response...")
            response = self._build_response(transcript)
            logger.info("[TRANSCRIBE] Pipeline complete, returning response")
            return response

        except (InvalidURLError, VideoNotFoundError):
            logger.exception("[TRANSCRIBE] URL/video error")
            raise
        except AudioDownloadError as e:
            logger.exception("[TRANSCRIBE] Audio download error: %s", e.detail)
            raise TranscriptionError(
                f"Failed to download audio: {e.detail}"
            ) from e
        except Exception as e:
            logger.exception("[TRANSCRIBE] Pipeline failed with exception")
            raise TranscriptionError(
                f"Transcription failed: {str(e)}"
            ) from e

    async def get_transcript(
        self,
        transcript_id: str,
        user_id: str,
    ) -> TranscriptionResponse:
        """Get an existing transcript by ID.

        Args:
            transcript_id: UUID of the transcript.
            user_id: Authenticated user's ID (for ownership check).

        Returns:
            TranscriptionResponse with transcript data.

        Raises:
            TranscriptionError: If transcript not found or unauthorized.
        """
        try:
            transcript_uuid = uuid.UUID(transcript_id)
        except ValueError:
            raise TranscriptionError("Invalid transcript ID format", status_code=400)

        user_uuid = uuid.UUID(user_id)

        result = await self.db.execute(
            select(Transcript).where(
                Transcript.id == transcript_uuid,
                Transcript.user_id == user_uuid,
            )
        )
        transcript = result.scalar_one_or_none()

        if not transcript:
            raise TranscriptionError("Transcript not found", status_code=404)

        return self._build_response(transcript)

    async def get_transcription_status(
        self,
        video_url: str,
        user_id: str,
    ) -> TranscriptionStatus:
        """Check if a transcript exists for a given video URL.

        Args:
            video_url: YouTube video URL.
            user_id: Authenticated user's ID.

        Returns:
            TranscriptionStatus with existence info.

        Raises:
            InvalidURLError: If the YouTube URL is invalid.
        """
        video_id = extract_video_id(video_url)
        if not video_id:
            raise InvalidURLError(f"Invalid YouTube URL: {video_url}")

        user_uuid = uuid.UUID(user_id)

        result = await self.db.execute(
            select(Transcript).where(
                Transcript.video_id == video_id,
                Transcript.user_id == user_uuid,
            )
        )
        transcript = result.scalar_one_or_none()

        return TranscriptionStatus(
            exists=transcript is not None,
            transcript_id=str(transcript.id) if transcript else None,
            created_at=transcript.created_at if transcript else None,
            language=transcript.detected_language if transcript else None,
            duration=transcript.duration if transcript else None,
        )

    async def list_user_transcripts(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[TranscriptionResponse], int]:
        """List all transcripts for a user with pagination.

        Args:
            user_id: Authenticated user's ID.
            skip: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            Tuple of (list of TranscriptionResponse objects, total count).
        """
        user_uuid = uuid.UUID(user_id)

        # Get total count
        count_result = await self.db.execute(
            select(func.count()).select_from(Transcript).where(
                Transcript.user_id == user_uuid
            )
        )
        total = count_result.scalar() or 0

        # Get paginated results
        result = await self.db.execute(
            select(Transcript)
            .where(Transcript.user_id == user_uuid)
            .order_by(Transcript.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        transcripts = result.scalars().all()

        return [self._build_response(t) for t in transcripts], total

    async def _get_existing_transcript(
        self,
        video_url: str,
        user_id: str,
    ) -> TranscriptionResponse | None:
        """Check if a transcript already exists for this video and user."""
        video_id = extract_video_id(video_url)
        if not video_id:
            raise InvalidURLError(f"Invalid YouTube URL: {video_url}")

        user_uuid = uuid.UUID(user_id)

        result = await self.db.execute(
            select(Transcript).where(
                Transcript.video_id == video_id,
                Transcript.user_id == user_uuid,
            )
        )
        transcript = result.scalar_one_or_none()

        if transcript:
            return self._build_response(transcript)
        return None

    async def _store_transcript(
        self,
        video_url: str,
        video_id: str,
        user_id: str,
        result: TranscriptionResult,
    ) -> Transcript:
        """Store transcription result in the database.

        Args:
            video_url: Original YouTube URL.
            video_id: Extracted video ID.
            user_id: Authenticated user's ID.
            result: Whisper transcription result.

        Returns:
            Stored Transcript model instance.
        """
        # Build segments JSON as a list
        segments_data = [
            {
                "id": seg.id,
                "start": seg.start,
                "end": seg.end,
                "text": seg.text,
                "avg_logprob": seg.avg_logprob,
                "no_speech_prob": seg.no_speech_prob,
                "compression_ratio": seg.compression_ratio,
            }
            for seg in result.segments
        ]

        user_uuid = uuid.UUID(user_id)

        transcript = Transcript(
            user_id=user_uuid,
            video_id=video_id,
            video_url=video_url,
            full_text=result.text,
            detected_language=result.language,
            language_probability=result.language_probability,
            duration=result.duration,
            segments=segments_data,
            segment_count=len(result.segments),
            processing_time=result.processing_time,
            model_used=settings.WHISPER_MODEL,
        )

        self.db.add(transcript)
        await self.db.commit()
        await self.db.refresh(transcript)

        logger.info(
            "Stored transcript %s for video %s",
            transcript.id,
            video_id,
        )

        return transcript

    def _build_response(self, transcript: Transcript) -> TranscriptionResponse:
        """Build API response from Transcript model.

        Args:
            transcript: Database transcript instance.

        Returns:
            TranscriptionResponse for API output.
        """
        segments = []
        if transcript.segments:
            segments = [
                TranscriptSegmentResponse(
                    id=seg.get("id", i),
                    start=seg.get("start", 0.0),
                    end=seg.get("end", 0.0),
                    text=seg.get("text", ""),
                    avg_logprob=seg.get("avg_logprob"),
                    no_speech_prob=seg.get("no_speech_prob"),
                    compression_ratio=seg.get("compression_ratio"),
                )
                for i, seg in enumerate(transcript.segments)
            ]

        return TranscriptionResponse(
            id=str(transcript.id),
            video_id=transcript.video_id,
            video_url=transcript.video_url,
            full_text=transcript.full_text,
            detected_language=transcript.detected_language,
            language_probability=transcript.language_probability,
            duration=transcript.duration,
            segments=segments,
            segment_count=transcript.segment_count,
            processing_time=transcript.processing_time,
            model_used=transcript.model_used,
            created_at=transcript.created_at,
        )
