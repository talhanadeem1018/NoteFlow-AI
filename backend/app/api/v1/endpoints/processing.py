"""Processing endpoints – background video processing with polling.

These endpoints replace the synchronous transcription → notes pipeline with
an async background job model to eliminate request timeouts for long videos.

Flow:
  1. POST /processing/start  → Creates a job, returns job_id immediately
  2. GET  /processing/{id}   → Poll for status (pending|processing|completed|failed)
  3. GET  /notes/{id}        → (Existing endpoint) Fetch generated notes when done
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.auth import get_current_user
from app.core.exceptions import InvalidURLError
from app.schemas.auth import AuthUser
from app.schemas.processing import (
    ProcessingJobResponse,
    ProcessingStatusResponse,
    StartProcessingRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/start",
    response_model=ProcessingJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start background video processing",
    description=(
        "Submit a YouTube URL for background processing. "
        "Returns immediately with a job ID. "
        "The backend will download audio, transcribe with Whisper, "
        "and generate AI notes asynchronously. "
        "Poll GET /processing/{id} for status updates."
    ),
    responses={
        401: {"description": "Authentication required"},
        422: {"description": "Invalid YouTube URL"},
    },
)
async def start_processing(
    body: StartProcessingRequest,
    user: AuthUser = Depends(get_current_user),
) -> ProcessingJobResponse:
    """Start processing a YouTube video in the background.

    This endpoint returns immediately with a job ID.
    The actual processing (audio download → Whisper transcription →
    AI notes generation) runs as a background asyncio task.
    """
    from app.services.processing import start_processing_background

    try:
        response = await start_processing_background(
            video_url=body.url,
            user_id=user.id,
            language=body.language,
            force_reprocess=body.force_reprocess,
        )
        logger.info(
            "[PROCESSING] Job %s started for user %s",
            response.job_id, user.id,
        )
        return response
    except InvalidURLError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.detail,
        )
    except Exception as e:
        logger.exception("[PROCESSING] Failed to start job: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start processing: {str(e)}",
        )


@router.get(
    "/{job_id}",
    response_model=ProcessingStatusResponse,
    summary="Get processing job status",
    description=(
        "Poll this endpoint to check the status of a background processing job. "
        "Returns the current status (pending|processing|completed|failed), "
        "progress message, and result IDs when available."
    ),
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Job not found"},
    },
)
async def get_job_status(
    job_id: str,
    user: AuthUser = Depends(get_current_user),
) -> ProcessingStatusResponse:
    """Get the current status of a processing job.

    Args:
        job_id: UUID of the processing job returned by POST /processing/start.

    Returns:
        ProcessingStatusResponse with current status and progress info.
    """
    from app.services.processing import get_job_status

    status_response = await get_job_status(job_id, user.id)

    if status_response is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Processing job not found",
        )

    return status_response
