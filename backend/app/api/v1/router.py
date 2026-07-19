"""API v1 router – aggregates all route modules."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, notes, videos, transcription

api_router = APIRouter()

# ── Register route modules ──────────────────────────────────────
api_router.include_router(
    videos.router,
    prefix="/videos",
    tags=["Videos"],
)
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Auth"],
)
api_router.include_router(
    notes.router,
    prefix="/notes",
    tags=["Notes"],
)
api_router.include_router(
    transcription.router,
    prefix="/transcription",
    tags=["Transcription"],
)

# ── Placeholder routers (uncomment as features are built) ───────
# from app.api.v1.endpoints import note_categories
# api_router.include_router(note_categories.router, prefix="/note-categories", tags=["Note Categories"])


@api_router.get("/ping", tags=["Health"])
async def ping():
    return {"message": "pong"}
