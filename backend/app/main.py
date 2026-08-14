"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.db.init_db import create_tables, verify_connection
from app.services.audio import cleanup_stale_audio_files

logger = logging.getLogger(__name__)


def _configure_app_logging() -> None:
    """Make application pipeline logs visible in the console.

    uvicorn's default logging config leaves the root logger at WARNING and
    attaches no handler to the app's loggers, so every INFO-level pipeline
    log (job start, audio download, Whisper invocation, transcription
    progress, completion) is silently swallowed – a job can look frozen even
    though Whisper is decoding at 100% CPU. We attach our own handler to the
    relevant loggers with propagate=False so uvicorn cannot suppress them,
    and mirror settings.DEBUG into the log level.
    """
    level = logging.DEBUG if settings.DEBUG else logging.INFO
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    )
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    # 'app' covers every module under app/ (services, api, etc.) via
    # logger propagation; 'faster_whisper' emits decode-stage INFO logs.
    for logger_name in ("app", "faster_whisper"):
        lg = logging.getLogger(logger_name)
        lg.setLevel(level)
        lg.handlers[:] = [handler]
        lg.propagate = False

    # Keep noisy HTTP client logs (e.g. HuggingFace revision checks during
    # model load) out of the way; WARNING and above still surfaces.
    logging.getLogger("httpx").setLevel(logging.WARNING)

    if settings.DEBUG:
        # engine.echo=True emits per-statement SQL through this logger.
        sql_logger = logging.getLogger("sqlalchemy.engine")
        sql_logger.setLevel(logging.INFO)
        sql_logger.handlers[:] = [handler]
        sql_logger.propagate = False


_configure_app_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan – startup and shutdown events."""
    # Startup: verify DB connection & create tables (dev convenience)
    if await verify_connection():
        logger.info("Database connection verified.")
        if settings.DEBUG:
            await create_tables()
            logger.info("Dev mode: tables created automatically.")
    else:
        logger.error("Could not connect to the database!")

    # Startup: clean up stale audio files
    try:
        removed = cleanup_stale_audio_files(max_age_hours=24)
        if removed > 0:
            logger.info("Startup cleanup: removed %d stale audio file(s)", removed)
    except Exception as e:
        logger.warning("Startup audio cleanup failed: %s", e)

    # Startup: recover orphaned processing jobs (marked as 'processing' after restart)
    try:
        from app.services.processing import recover_orphaned_jobs
        await recover_orphaned_jobs()
    except Exception as e:
        logger.warning("Startup orphan job recovery failed: %s", e)

    yield

    # Shutdown: cleanup Whisper model resources
    try:
        from app.services.transcription.whisper_service import whisper_service
        whisper_service.cleanup()  # Release model memory
        logger.info("Whisper model released.")
    except Exception as e:
        logger.warning("Whisper cleanup failed: %s", e)

    # Shutdown: dispose of the engine connection pool
    from app.db.session import engine
    await engine.dispose()
    logger.info("Database engine disposed.")


def create_app() -> FastAPI:
    """Application factory pattern."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description="AI-powered YouTube video notes and study material generator",
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url=f"{settings.API_V1_PREFIX}/docs",
        redoc_url=f"{settings.API_V1_PREFIX}/redoc",
        lifespan=lifespan,
    )

    # ── Exception handlers ──────────────────────────────────────
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "status_code": exc.status_code},
        )

    # ── CORS middleware ──────────────────────────────────────────
    # Build the CORS origins list, ensuring the production frontend URL
    # is always included regardless of environment variable overrides.
    PRODUCTION_FRONTEND_URL = "https://note-flow-ai-eight.vercel.app"

    cors_origins = list(settings.CORS_ORIGINS)
    if settings.PRODUCTION_DOMAIN:
        cors_origins.append(settings.PRODUCTION_DOMAIN)
    if PRODUCTION_FRONTEND_URL not in cors_origins:
        cors_origins.append(PRODUCTION_FRONTEND_URL)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Include API router ──────────────────────────────────────
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "healthy", "version": settings.VERSION}

    return app


app = create_app()
