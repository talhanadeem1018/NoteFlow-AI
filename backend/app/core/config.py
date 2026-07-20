from functools import lru_cache
from pathlib import Path
import tempfile

from pydantic_settings import BaseSettings, SettingsConfigDict
"""Core configuration using Pydantic Settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # ── Application ──────────────────────────────────────────────
    PROJECT_NAME: str = "NoteFlow AI API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # ── CORS ─────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "https://vercel.app",  # Production (update with your domain)
    ]

    # ── Database (Supabase PostgreSQL) ───────────────────────────
    DATABASE_URL: str = ""  # async pooler URL for FastAPI
    DIRECT_URL: str = ""      # direct URL for Alembic migrations

    # ── Supabase ─────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""  # anon/public key
    SUPABASE_SERVICE_KEY: str = ""  # service_role key (server only)

    # ── JWT ─────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440  # 24 hours

    # ── AI Providers (provider-agnostic) ────────────────────────
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # Default AI provider: "openai" | "anthropic" | "google"
    DEFAULT_AI_PROVIDER: str = "openai"

    # ── OpenRouter (AI Routing Layer) ──────────────────────────
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    DEFAULT_LLM_MODEL: str = "google/gemini-2.5-flash"

    # ── YouTube Processing ──────────────────────────────────────
    YTDLP_PATH: str = "yt-dlp"
    FFMPEG_PATH: str = "ffmpeg"
    FFPROBE_PATH: str = "ffprobe"

    # ── Whisper (Speech-to-Text) ───────────────────────────────
    WHISPER_MODEL: str = "base"  # tiny | base | small | medium | large-v2 | large-v3
    WHISPER_DEVICE: str = "cpu"  # cpu | cuda
    WHISPER_COMPUTE_TYPE: str = "int8"  # int8 (CPU) | float16 (GPU) | float32
    WHISPER_LANGUAGE: str | None = None  # None = auto-detect, or "en", "es", etc.
    WHISPER_BEAM_SIZE: int = 5
    WHISPER_VAD_FILTER: bool = True  # Voice Activity Detection for better performance

    # ── Storage ──────────────────────────────────────────────────
    STORAGE_BUCKET: str = "noteflow-ai"

    # ── Temp Files ──────────────────────────────────────────────
    TEMP_DIR: str = str(Path(tempfile.gettempdir()) / "noteflow-ai")


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()


settings = get_settings()
