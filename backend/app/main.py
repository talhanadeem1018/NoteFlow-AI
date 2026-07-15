"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.services.audio import cleanup_stale_audio_files

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan – startup and shutdown events."""
    # Startup: initialize DB connections, caches, etc.
    try:
        removed = cleanup_stale_audio_files(max_age_hours=24)
        if removed > 0:
            logger.info("Startup cleanup: removed %d stale audio file(s)", removed)
    except Exception as e:
        logger.warning("Startup audio cleanup failed: %s", e)
    yield
    # Shutdown: close connections, cleanup resources


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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
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
