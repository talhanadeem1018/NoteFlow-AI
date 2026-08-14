"""Processing service – orchestrates background video processing jobs.

The key insight is that this service runs in a background asyncio task,
completely outside the HTTP request lifecycle. This eliminates timeouts
because no request waits for long-running operations.

The service reuses the existing TranscriptionService and NotesGeneratorService
internally, ensuring zero code duplication.

Pause / Resume / Cancel:
    Every running job keeps an asyncio.Task in `_running_tasks`. Control
    operations (pause/cancel) persist the new status FIRST, then cancel the
    task at its next await point. Because the status is persisted before the
    task is cancelled, a cancelled/paused job can never be flipped to 'failed'
    by the worker's exception handler. Resume spawns a fresh task that
    continues from the job's persisted checkpoint (`current_stage`) and
    reuses already-completed artifacts (video_metadata, transcript, cached
    WAV, notes) instead of restarting the pipeline.

Interruptions:
    If the server restarts, orphaned 'processing'/'pending' jobs are marked
    'interrupted' at startup (recover_orphaned_jobs) so the user can resume.
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import async_session_factory
from app.models.processing_job import ProcessingJob
from app.schemas.processing import ProcessingJobResponse, ProcessingStatusResponse
from app.schemas.note import NoteGenerateRequest
from app.services.ai.notes_generator import NotesGeneratorService
from app.services.audio import cleanup_audio_file, download_and_convert_audio
from app.services.transcription.transcription_service import TranscriptionService
from app.services.transcription.whisper_service import whisper_service
from app.services.youtube import extract_video_id, fetch_video_metadata

logger = logging.getLogger(__name__)

# Concurrency limiter – prevents CPU thrashing from too many simultaneous
# Whisper transcriptions. Max 3 concurrent jobs; additional jobs queue in
# the event loop and start when a slot opens.
_processing_semaphore = asyncio.Semaphore(3)

# Registry of running background tasks keyed by job UUID. Used to cancel
# tasks on pause/cancel and to prevent duplicate resumes. Tasks are
# registered synchronously at spawn time, so a live worker always has an
# entry here.
_running_tasks: dict[uuid.UUID, asyncio.Task] = {}

# Job statuses that are terminal (cannot be paused/resumed).
_TERMINAL_STATUSES = ("completed", "cancelled")

# Approximate progress % per stage – derived from real pipeline state,
# never fabricated.
_STAGE_PROGRESS = {
    "metadata": 15,
    "downloading": 35,
    "transcribing": 65,
    "generating_notes": 85,
    "completed": 100,
}


def _compute_progress(status: str, current_stage: str | None) -> int:
    """Compute a 0-100 progress value from the persisted checkpoint."""
    if status == "completed":
        return 100
    if status == "pending":
        return 5
    return _STAGE_PROGRESS.get(current_stage or "", 15)


def _build_status_response(job: ProcessingJob) -> ProcessingStatusResponse:
    """Build the polling/control response from a ProcessingJob instance."""
    return ProcessingStatusResponse(
        job_id=str(job.id),
        status=job.status,
        current_stage=job.current_stage,
        progress=_compute_progress(job.status, job.current_stage),
        progress_message=job.progress_message,
        transcript_id=str(job.transcript_id) if job.transcript_id else None,
        note_id=str(job.note_id) if job.note_id else None,
        error_message=job.error_message,
        paused_at=job.paused_at,
        cancelled_at=job.cancelled_at,
        interrupted_at=job.interrupted_at,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )


def _cancel_running_task(job_uuid: uuid.UUID) -> bool:
    """Best-effort cancellation of the background task for a job.

    The task is cancelled at its next await point. Operations running in
    thread-pool threads (yt-dlp download, Whisper decode, the AI HTTP call)
    cannot be force-killed – they finish in the background, but their results
    are discarded and never stored.
    """
    task = _running_tasks.get(job_uuid)
    if task is not None and not task.done():
        task.cancel()
        return True
    return False


async def _find_existing_job(user_id: str, video_url: str) -> ProcessingJobResponse | None:
    """Check if the user already has a reusable job for this video URL.

    Reuses any non-completed job (pending/processing/paused/interrupted/failed)
    so resubmitting a URL never creates a duplicate job – the frontend shows
    the existing job's state (e.g. a Resume button for paused jobs).

    Args:
        user_id: Authenticated user's Supabase Auth UID.
        video_url: YouTube video URL to check.

    Returns:
        Existing ProcessingJobResponse if a reusable job is found, None otherwise.
    """
    user_uuid = uuid.UUID(user_id)

    async with async_session_factory() as db:
        # Check for an active/recoverable job for this user+url
        result = await db.execute(
            select(ProcessingJob).where(
                ProcessingJob.user_id == user_uuid,
                ProcessingJob.video_url == video_url,
                ProcessingJob.status.in_(
                    ("pending", "processing", "paused", "interrupted", "failed")
                ),
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
    """On startup, mark jobs stuck in 'processing'/'pending' as 'interrupted'.

    When the server restarts, any background tasks are destroyed immediately.
    Their job records remain in the database with status='processing'/'pending'.
    Instead of failing them, we mark them 'interrupted' so the user can resume
    from the last persisted checkpoint.

    Returns:
        Number of jobs that were recovered.
    """
    async with async_session_factory() as db:
        result = await db.execute(
            select(ProcessingJob).where(
                ProcessingJob.status.in_(["processing", "pending"])
            )
        )
        orphaned = result.scalars().all()

        now = datetime.now(timezone.utc)
        for job in orphaned:
            job.status = "interrupted"
            job.interrupted_at = now
            job.updated_at = now
            logger.warning(
                "[PROCESSING] Orphaned job %s recovered (status=%s -> 'interrupted')",
                job.id, job.status,
            )

        await db.commit()

    count = len(orphaned)
    if count > 0:
        logger.info("[PROCESSING] Startup recovery: marked %d orphaned job(s) as interrupted", count)
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
    # ── Duplicate check: reuse existing job if one is already active/recoverable ──
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
            language=language,
            force_reprocess=force_reprocess,
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
    task = asyncio.create_task(
        _process_job(
            job_id=str(job.id),
            video_url=video_url,
            user_id=user_id,
            language=language,
            force_reprocess=force_reprocess,
        )
    )
    # Register synchronously so a concurrent pause/resume sees the task
    # immediately, even before the coroutine's first execution.
    _running_tasks[job.id] = task

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

        return _build_status_response(job)


async def pause_job(job_id: str, user_id: str) -> ProcessingStatusResponse | None:
    """Pause a running (or queued) processing job.

    Persists status='paused' first, then cancels the background task at its
    next await point. Progress/checkpoints are preserved so the job can be
    resumed later.

    Args:
        job_id: UUID of the processing job.
        user_id: Authenticated user's ID for ownership verification.

    Returns:
        Updated ProcessingStatusResponse, or None if not found/unauthorized.
    """
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        return None

    async with async_session_factory() as db:
        job = await _load_job_for_update(db, job_uuid, user_id)
        if job is None:
            return None

        if job.status in _TERMINAL_STATUSES or job.status == "failed":
            # Terminal states cannot be paused – return current status so the
            # frontend can render the appropriate UI.
            return _build_status_response(job)

        if job.status == "paused":
            # Idempotent – already paused.
            return _build_status_response(job)

        now = datetime.now(timezone.utc)
        job.status = "paused"
        job.paused_at = now
        job.error_message = None
        job.updated_at = now
        await db.commit()

    _cancel_running_task(job_uuid)
    logger.info("[PROCESSING] Job %s paused by user %s", job_id, user_id)
    return _build_status_response(job)


async def cancel_job(job_id: str, user_id: str) -> ProcessingStatusResponse | None:
    """Cancel a processing job and discard its progress.

    Persists status='cancelled' first, then cancels the background task and
    removes the temporary WAV file. The user can start a brand-new job
    afterwards.

    Args:
        job_id: UUID of the processing job.
        user_id: Authenticated user's ID for ownership verification.

    Returns:
        Updated ProcessingStatusResponse, or None if not found/unauthorized.
    """
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        return None

    async with async_session_factory() as db:
        job = await _load_job_for_update(db, job_uuid, user_id)
        if job is None:
            return None

        if job.status == "completed":
            # A completed job has persisted notes – do not discard them.
            return _build_status_response(job)

        if job.status == "cancelled":
            # Idempotent – already cancelled.
            return _build_status_response(job)

        now = datetime.now(timezone.utc)
        job.status = "cancelled"
        job.cancelled_at = now
        job.error_message = None
        job.updated_at = now
        await db.commit()

    _cancel_running_task(job_uuid)

    # Clean up the temporary WAV checkpoint – cancelled progress is discarded.
    video_id = extract_video_id(job.video_url)
    if video_id:
        try:
            cleanup_audio_file(video_id)
        except Exception as e:
            logger.warning("[PROCESSING] Job %s: audio cleanup failed: %s", job_id, e)

    logger.info("[PROCESSING] Job %s cancelled by user %s", job_id, user_id)
    return _build_status_response(job)


async def resume_job(job_id: str, user_id: str) -> ProcessingStatusResponse | None:
    """Resume a paused/interrupted (or failed) processing job.

    Continues the SAME job from its latest checkpoint – completed stages are
    never re-run. Guards against duplicate resumes with a row lock PLUS a
    re-check of the task registry inside the lock, so concurrent resume
    requests cannot double-spawn a worker.

    Args:
        job_id: UUID of the processing job.
        user_id: Authenticated user's ID for ownership verification.

    Returns:
        Updated ProcessingStatusResponse, or None if not found/unauthorized.
    """
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        return None

    async with async_session_factory() as db:
        job = await _load_job_for_update(db, job_uuid, user_id)
        if job is None:
            return None

        if job.status in _TERMINAL_STATUSES:
            # Terminal states cannot be resumed.
            return _build_status_response(job)

        if job.status == "pending":
            # The original worker is scheduled/registered – do not double-spawn.
            return _build_status_response(job)

        # Re-check the registry INSIDE the row lock so a concurrent resume
        # that already spawned a task is detected.
        running_task = _running_tasks.get(job_uuid)
        if running_task is not None and not running_task.done():
            logger.info(
                "[PROCESSING] Job %s already running – duplicate resume ignored", job_id
            )
            return _build_status_response(job)

        if job.status == "processing":
            # Status is 'processing' but no live task → the worker died
            # (e.g. hard crash without status update). Restart from checkpoint.
            logger.warning(
                "[PROCESSING] Job %s stuck in 'processing' with no live task; restarting", job_id
            )

        # Resumable: paused / interrupted / failed / processing-with-dead-task.
        now = datetime.now(timezone.utc)
        job.status = "processing"
        job.paused_at = None
        job.interrupted_at = None
        job.error_message = None
        job.updated_at = now
        await db.commit()

        video_url = job.video_url
        language = job.language
        force_reprocess = job.force_reprocess

    try:
        task = asyncio.create_task(
            _process_job(
                job_id=job_id,
                video_url=video_url,
                user_id=user_id,
                language=language,
                force_reprocess=force_reprocess,
            )
        )
        _running_tasks[job_uuid] = task
    except Exception:
        logger.exception("[PROCESSING] Job %s: failed to create resume task", job_id)
        async with async_session_factory() as db:
            await _update_job(
                db, job_uuid,
                status="interrupted",
                interrupted_at=datetime.now(timezone.utc),
                error_message="Failed to restart processing job",
            )
        raise

    logger.info(
        "[PROCESSING] Job %s resumed by user %s (stage=%s)",
        job_id, user_id, job.current_stage,
    )
    return _build_status_response(job)


async def _load_job_for_update(
    db: AsyncSession,
    job_uuid: uuid.UUID,
    user_id: str,
) -> ProcessingJob | None:
    """Load a user's job with a row lock (serializes concurrent control ops).

    Returns None if the job is not found or does not belong to the user.
    """
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        return None

    result = await db.execute(
        select(ProcessingJob).where(
            ProcessingJob.id == job_uuid,
            ProcessingJob.user_id == user_uuid,
        ).with_for_update()
    )
    return result.scalar_one_or_none()


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

    Checkpoint-aware pipeline:
        1. Fetch video metadata (skipped if video_metadata already persisted)
        2. Download audio + convert to WAV (skipped if a cached transcript or WAV exists)
        3. Transcribe with Whisper (skipped if a transcript exists)
        4. Store transcript in DB
        5. Generate AI notes via OpenRouter (skipped if a note exists)
        6. Store notes in DB
        7. Mark job as completed
    """
    job_uuid = uuid.UUID(job_id)
    start_time = time.time()

    task = asyncio.current_task()
    if task is not None:
        _running_tasks[job_uuid] = task

    logger.info("[PROCESSING] Job %s: background processing started (waiting for semaphore...)", job_id)

    try:
        # Acquire concurrency slot – this blocks if 3 jobs are already running.
        # Using the semaphore inside the try block ensures release even on failure.
        async with _processing_semaphore:
            try:
                async with async_session_factory() as db:
                    # Load the job and decide whether we may run.
                    result = await db.execute(
                        select(ProcessingJob).where(ProcessingJob.id == job_uuid).with_for_update()
                    )
                    job = result.scalar_one_or_none()

                    if job is None:
                        logger.warning("[PROCESSING] Job %s not found; worker exits", job_id)
                        return

                    if job.status in ("cancelled", "completed", "failed"):
                        logger.info(
                            "[PROCESSING] Job %s status=%s; worker exits", job_id, job.status
                        )
                        return

                    if job.status == "paused":
                        logger.info(
                            "[PROCESSING] Job %s was paused before worker start; exiting", job_id
                        )
                        return

                    # (Re)activate the job.
                    await _update_job(
                        db, job_uuid,
                        status="processing",
                        progress_message="Starting...",
                        error_message=None,
                    )

                    # ── Stage 1: Fetch metadata (skip if already fetched) ──
                    if not job.video_metadata:
                        await _update_job(
                            db, job_uuid,
                            current_stage="metadata",
                            progress_message="Fetching video metadata...",
                        )
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
                            logger.warning(
                                "[PROCESSING] Job %s: metadata fetch failed (non-fatal): %s",
                                job_id, e,
                            )

                    # ── Stage 2+3: Transcript (skip if already available) ──
                    transcript_id = str(job.transcript_id) if job.transcript_id else None

                    if transcript_id is None:
                        transcription_service = TranscriptionService(db)

                        # Checkpoint: reuse an existing transcript for this video.
                        existing = await transcription_service._get_existing_transcript(
                            video_url, user_id
                        )
                        if existing is not None and not force_reprocess:
                            transcript_id = existing.id
                            logger.info(
                                "[PROCESSING] Job %s: reusing cached transcript %s",
                                job_id, transcript_id,
                            )
                        else:
                            # Stage: download (skips re-download if WAV is cached).
                            await _update_job(
                                db, job_uuid,
                                current_stage="downloading",
                                progress_message="Downloading audio...",
                            )
                            audio_info = await download_and_convert_audio(video_url)
                            logger.info(
                                "[PROCESSING] Job %s: audio ready (path=%s, size=%d bytes, duration=%ss, video_id=%s)",
                                job_id, audio_info.audio_path, audio_info.file_size,
                                audio_info.duration, audio_info.video_id,
                            )

                            # Stage: transcribe.
                            await _update_job(
                                db, job_uuid,
                                current_stage="transcribing",
                                progress_message="Transcribing audio...",
                            )
                            logger.info(
                                "[PROCESSING] Job %s: starting transcription "
                                "(model=%s, device=%s, compute=%s, beam=%s, vad=%s, language=%s, audio=%s)",
                                job_id,
                                settings.WHISPER_MODEL, settings.WHISPER_DEVICE,
                                settings.WHISPER_COMPUTE_TYPE, settings.WHISPER_BEAM_SIZE,
                                settings.WHISPER_VAD_FILTER, language or "auto",
                                audio_info.audio_path,
                            )
                            transcribe_start = time.time()

                            # Whisper decodes for minutes without changing
                            # stage – surface live progress to the job row so
                            # the UI shows activity instead of appearing stuck.
                            # The callback runs in the Whisper worker thread,
                            # so it only updates this shared holder; a separate
                            # task persists it to the DB every ~10s.
                            progress_holder = {"segments": 0, "elapsed": 0.0}

                            async def _report_transcription_progress() -> None:
                                last_message: str | None = None
                                while True:
                                    await asyncio.sleep(10)
                                    segments = progress_holder["segments"]
                                    elapsed = progress_holder["elapsed"]
                                    message = (
                                        f"Transcribing audio... {segments} segments processed "
                                        f"({int(elapsed)}s elapsed)"
                                    )
                                    if message == last_message:
                                        continue
                                    last_message = message
                                    try:
                                        # Own session – never share the worker
                                        # session across concurrent tasks.
                                        async with async_session_factory() as progress_db:
                                            await _update_job(
                                                progress_db, job_uuid,
                                                progress_message=message,
                                            )
                                    except Exception:
                                        logger.exception(
                                            "[PROCESSING] Job %s: progress update failed", job_id,
                                        )

                            progress_reporter = asyncio.create_task(_report_transcription_progress())
                            try:
                                transcription_result = await whisper_service.transcribe(
                                    audio_path=audio_info.audio_path,
                                    language=language,
                                    beam_size=None,
                                    vad_filter=None,
                                    progress_callback=lambda segs, elapsed: progress_holder.update(
                                        segments=segs, elapsed=elapsed,
                                    ),
                                )
                            finally:
                                progress_reporter.cancel()

                            logger.info(
                                "[PROCESSING] Job %s: transcription complete "
                                "(%d segments, %.1fs audio, language=%s, elapsed=%.1fs)",
                                job_id,
                                len(transcription_result.segments),
                                transcription_result.duration,
                                transcription_result.language,
                                time.time() - transcribe_start,
                            )

                            transcript = await transcription_service._store_transcript(
                                video_url=video_url,
                                video_id=audio_info.video_id,
                                user_id=user_id,
                                result=transcription_result,
                            )
                            transcript_id = str(transcript.id)
                            logger.info(
                                "[PROCESSING] Job %s: transcript stored (id=%s)",
                                job_id, transcript_id,
                            )

                            # Checkpoint persisted – the WAV is no longer needed.
                            await _update_job(
                                db, job_uuid,
                                transcript_id=uuid.UUID(transcript_id),
                            )
                            try:
                                cleanup_audio_file(audio_info.video_id)
                            except Exception:
                                pass

                    # ── Stage 4+5: Generate AI notes (skip if already stored) ──
                    note_id = str(job.note_id) if job.note_id else None

                    if note_id is None:
                        logger.info(
                            "[PROCESSING] Job %s: generating AI notes (transcript=%s)...",
                            job_id, transcript_id,
                        )
                        await _update_job(
                            db, job_uuid,
                            current_stage="generating_notes",
                            progress_message="Generating AI notes...",
                        )
                        notes_generator = NotesGeneratorService(db)
                        note_request = NoteGenerateRequest(
                            transcript_id=transcript_id,
                            force_regenerate=force_reprocess,
                        )
                        note_result = await notes_generator.generate_notes(note_request, user_id)
                        note_id = str(note_result.id)

                        await _update_job(
                            db, job_uuid,
                            note_id=uuid.UUID(note_id),
                        )
                        # Close the AI service client
                        try:
                            await notes_generator.ai_service.close()
                        except Exception:
                            pass

                    # ── Stage 6: Completed ──
                    await _update_job(
                        db, job_uuid,
                        status="completed",
                        current_stage="completed",
                        progress_message="Done!",
                        completed_at=datetime.now(timezone.utc),
                    )

                elapsed = time.time() - start_time
                logger.info(
                    "[PROCESSING] Job %s: completed in %.2f seconds (transcript=%s, note=%s)",
                    job_id, elapsed, transcript_id, note_id,
                )

            except asyncio.CancelledError:
                # Pause/cancel already persisted the new status BEFORE the task
                # was cancelled – do not overwrite it with 'failed'.
                logger.info(
                    "[PROCESSING] Job %s: task cancelled (pause/cancel) – stopped cleanly", job_id
                )
                raise

            except Exception as e:
                elapsed = time.time() - start_time
                logger.exception(
                    "[PROCESSING] Job %s: failed after %.2f seconds: %s",
                    job_id, elapsed, str(e),
                )

                # Mark job as failed – but only if it is still in a runnable
                # state (a concurrent pause/cancel wins).
                try:
                    async with async_session_factory() as db:
                        result = await db.execute(
                            select(ProcessingJob).where(ProcessingJob.id == job_uuid)
                        )
                        job = result.scalar_one_or_none()
                        if job is not None and job.status not in (
                            "paused", "cancelled", "completed",
                        ):
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
    finally:
        _running_tasks.pop(job_uuid, None)
