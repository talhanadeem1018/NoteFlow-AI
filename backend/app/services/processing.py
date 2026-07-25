"""Processing service – orchestrates background video processing jobs.

The key insight is that this service runs in a background asyncio task,
completely outside the HTTP request lifecycle. This eliminates timeouts
because no request waits for long-running operations.

The service reuses the existing TranscriptionService and NotesGeneratorService
internally, ensuring zero code duplication.
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.processing_job import ProcessingJob
from app.schemas.processing import ProcessingJobResponse, ProcessingStatusResponse
from app.schemas.transcription import TranscriptionRequest
from app.schemas.note import NoteGenerateRequest
from app.services.transcription.transcription_service import TranscriptionService
from app.services.audio import cleanup_audio_file
from app.services.youtube import fetch_video_metadata
from app.services.ai.notes_generator import NotesGeneratorService

logger = logging.getLogger(__name__)

# Concurrency limiter – prevents CPU thrashing from too many simultaneous
# Whisper transcriptions. Max 3 concurrent jobs; additional jobs queue in
# the event loop and start when a slot opens.
_processing_semaphore = asyncio.Semaphore(3)


async def _find_existing_job(user_id: str, video_url: str) -> ProcessingJobResponse | None:
    """Check if the user already has a pending/completed job for this video URL.

    Args:
        user_id: Authenticated user's Supabase Auth UID.
        video_url: YouTube video URL to check.

    Returns:
        Existing ProcessingJobResponse if a reusable job is found, None otherwise.
    """
    user_uuid = uuid.UUID(user_id)

    async with async_session_factory() as db:
        # Check for an active (pending/processing) job for this user+url
        result = await db.execute(
            select(ProcessingJob).where(
                ProcessingJob.user_id == user_uuid,
                ProcessingJob.video_url == video_url,
                ProcessingJob.status.in_(["pending", "processing"]),
            ).order_by(ProcessingJob.created_at.desc()).limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            logger.info(
                "[PROCESSING] Reusing existing %s job %s for user %s, video=%s",
                existing.status, existing.id, user_id, video_url,
            )
            return ProcessingJobResponse(
                job_id=str(existing.id),
                status=existing.status,
                progress_message=existing.progress_message,
                created_at=existing.created_at,
            )

        # Check for a completed job with both transcript and notes
        result = await db.execute(
            select(ProcessingJob).where(
                ProcessingJob.user_id == user_uuid,
                ProcessingJob.video_url == video_url,
                ProcessingJob.status == "completed",
                ProcessingJob.transcript_id.isnot(None),
                ProcessingJob.note_id.isnot(None),
            ).order_by(ProcessingJob.created_at.desc()).limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            logger.info(
                "[PROCESSING] Reusing completed job %s for user %s, video=%s",
                existing.id, user_id, video_url,
            )
            return ProcessingJobResponse(
                job_id=str(existing.id),
                status=existing.status,
                progress_message=existing.progress_message,
                created_at=existing.created_at,
            )

    return None


async def recover_orphaned_jobs() -> int:
    """On startup, mark any jobs stuck in 'processing' as failed.

    When the server restarts, any background tasks are destroyed immediately.
    Their job records remain in the database with status='processing' forever.
    This function recovers those zombie jobs so the system is in a clean state.

    Returns:
        Number of jobs that were recovered.
    """
    async with async_session_factory() as db:
        result = await db.execute(
            select(ProcessingJob).where(ProcessingJob.status == "processing")
        )
        orphaned = result.scalars().all()

        now = datetime.now(timezone.utc)
        for job in orphaned:
            job.status = "failed"
            job.error_message = "Server restarted during processing."
            job.completed_at = now
            job.updated_at = now
            logger.warning(
                "[PROCESSING] Orphaned job %s recovered (status='processing' -> 'failed')",
                job.id,
            )

        await db.commit()

    count = len(orphaned)
    if count > 0:
        logger.info("[PROCESSING] Startup recovery: marked %d orphaned job(s) as failed", count)
    return count


async def start_processing_background(
    video_url: str,
    user_id: str,
    language: str | None = None,
    force_reprocess: bool = False,
) -> ProcessingJobResponse:
    """Create a processing job record and launch background processing.

    This function returns immediately with a job ID. The actual work
    runs in a background asyncio task.

    Args:
        video_url: YouTube video URL to process.
        user_id: Authenticated user's Supabase Auth UID.
        language: Optional language hint for transcription.
        force_reprocess: Force re-transcription if cached exists.

    Returns:
        ProcessingJobResponse with the job ID for polling.

    Raises:
        AppError: If URL is invalid.
    """
    # ── Duplicate check: reuse existing job if one is already active or completed ──
    if not force_reprocess:
        existing = await _find_existing_job(user_id, video_url)
        if existing is not None:
            logger.info(
                "[PROCESSING] Duplicate prevented: reusing existing job %s for user %s",
                existing.job_id, user_id,
            )
            return existing

    # ── Create a new job record ──
    async with async_session_factory() as db:
        user_uuid = uuid.UUID(user_id)
        now = datetime.now(timezone.utc)

        job = ProcessingJob(
            user_id=user_uuid,
            video_url=video_url,
            status="pending",
            progress_message="Queued...",
            created_at=now,
            updated_at=now,
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)

        response = ProcessingJobResponse(
            job_id=str(job.id),
            status=job.status,
            progress_message=job.progress_message,
            created_at=job.created_at,
        )

    # ── Launch background processing ──
    asyncio.create_task(
        _process_job(
            job_id=str(job.id),
            video_url=video_url,
            user_id=user_id,
            language=language,
            force_reprocess=force_reprocess,
        )
    )

    logger.info(
        "[PROCESSING] Job %s created for user %s, video=%s",
        response.job_id, user_id, video_url,
    )
    return response


async def get_job_status(job_id: str, user_id: str) -> ProcessingStatusResponse | None:
    """Get the current status of a processing job.

    Args:
        job_id: UUID of the processing job.
        user_id: Authenticated user's ID for ownership verification.

    Returns:
        ProcessingStatusResponse if found, None if not found or unauthorized.
    """
    try:
        job_uuid = uuid.UUID(job_id)
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        return None

    async with async_session_factory() as db:
        result = await db.execute(
            select(ProcessingJob).where(
                ProcessingJob.id == job_uuid,
                ProcessingJob.user_id == user_uuid,
            )
        )
        job = result.scalar_one_or_none()

        if job is None:
            return None

        return ProcessingStatusResponse(
            job_id=str(job.id),
            status=job.status,
            progress_message=job.progress_message,
            transcript_id=str(job.transcript_id) if job.transcript_id else None,
            note_id=str(job.note_id) if job.note_id else None,
            error_message=job.error_message,
            created_at=job.created_at,
            completed_at=job.completed_at,
        )


async def _update_job(
    db: AsyncSession,
    job_id: uuid.UUID,
    **kwargs,
) -> None:
    """Update a job record with new values.

    Args:
        db: Database session.
        job_id: Job UUID.
        kwargs: Fields to update (status, progress_message, error_message, etc.).
    """
    result = await db.execute(
        select(ProcessingJob).where(ProcessingJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if job is None:
        logger.warning("[PROCESSING] Job %s not found for update", job_id)
        return

    for key, value in kwargs.items():
        setattr(job, key, value)
    job.updated_at = datetime.now(timezone.utc)

    await db.commit()


async def _process_job(
    job_id: str,
    video_url: str,
    user_id: str,
    language: str | None = None,
    force_reprocess: bool = False,
) -> None:
    """Background worker that runs the full processing pipeline.

    This function runs in a background asyncio task. It creates its own
    database session and reuses existing services for transcription and
    notes generation.

    Pipeline:
        1. Fetch video metadata (fast)
        2. Download audio + convert to WAV
        3. Transcribe with Whisper
        4. Store transcript in DB
        5. Generate AI notes via OpenRouter
        6. Store notes in DB
        7. Mark job as completed
    """
    job_uuid = uuid.UUID(job_id)
    start_time = time.time()

    logger.info("[PROCESSING] Job %s: background processing started (waiting for semaphore...)", job_id)

    # Acquire concurrency slot – this blocks if 3 jobs are already running.
    # Using the semaphore inside the try block ensures release even on failure.
    async with _processing_semaphore:
        logger.info("[PROCESSING] Job %s: semaphore acquired, starting work", job_id)

        try:
            async with async_session_factory() as db:
                # Step 0: Mark as processing
                await _update_job(db, job_uuid, status="processing", progress_message="Starting...")

                # Step 1: Fetch metadata (fast, but useful for progress tracking)
                await _update_job(db, job_uuid, progress_message="Fetching video metadata...")
                try:
                    metadata = await fetch_video_metadata(video_url)
                    await _update_job(
                        db, job_uuid,
                        video_metadata=json.dumps({
                            "title": metadata.title,
                            "channel": metadata.channel,
                            "duration": metadata.duration,
                            "thumbnail_url": metadata.thumbnail_url,
                        }),
                    )
                except Exception as e:
                    logger.warning("[PROCESSING] Job %s: metadata fetch failed (non-fatal): %s", job_id, e)

                # Step 2 + 3 + 4: Transcribe (download audio → convert → Whisper → store)
                await _update_job(db, job_uuid, progress_message="Transcribing audio...")
                transcription_service = TranscriptionService(db)
                transcription_request = TranscriptionRequest(
                    url=video_url,
                    language=language,
                    force_reprocess=force_reprocess,
                )
                transcript_result = await transcription_service.start_transcription(
                    transcription_request, user_id
                )

                # Store the transcript_id on the job
                await _update_job(
                    db, job_uuid,
                    transcript_id=uuid.UUID(transcript_result.id),
                    progress_message="Generating AI notes...",
                )

                # Step 5 + 6: Generate AI notes and store
                notes_generator = NotesGeneratorService(db)
                note_request = NoteGenerateRequest(
                    transcript_id=transcript_result.id,
                    force_regenerate=force_reprocess,
                )
                note_result = await notes_generator.generate_notes(note_request, user_id)

                # Store the note_id on the job
                await _update_job(
                    db, job_uuid,
                    note_id=uuid.UUID(note_result.id),
                    status="completed",
                    progress_message="Done!",
                    completed_at=datetime.now(timezone.utc),
                )

                # Clean up audio file
                try:
                    cleanup_audio_file(transcript_result.video_id)
                except Exception:
                    pass

                # Close the AI service client
                try:
                    await notes_generator.ai_service.close()
                except Exception:
                    pass

            elapsed = time.time() - start_time
            logger.info(
                "[PROCESSING] Job %s: completed in %.2f seconds (transcript=%s, note=%s)",
                job_id, elapsed, transcript_result.id, note_result.id,
            )

        except Exception as e:
            elapsed = time.time() - start_time
            logger.exception(
                "[PROCESSING] Job %s: failed after %.2f seconds: %s",
                job_id, elapsed, str(e),
            )

            # Mark job as failed
            try:
                async with async_session_factory() as db:
                    await _update_job(
                        db, job_uuid,
                        status="failed",
                        error_message=str(e)[:500],
                        completed_at=datetime.now(timezone.utc),
                    )
            except Exception as db_error:
                logger.error(
                    "[PROCESSING] Job %s: failed to update status: %s",
                    job_id, db_error,
                )
