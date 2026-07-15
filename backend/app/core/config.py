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
    DATABASE_URL: str = ""

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

    # ── YouTube Processing ──────────────────────────────────────
    YTDLP_PATH: str = "yt-dlp"
    FFMPEG_PATH: str = "ffmpeg"
    FFPROBE_PATH: str = "ffprobe"
    WHISPER_MODEL: str = "base"  # tiny | base | small | medium | large

    # ── Storage ──────────────────────────────────────────────────
    STORAGE_BUCKET: str = "noteflow-ai"

    # ── Temp Files ──────────────────────────────────────────────
    TEMP_DIR: str = "/tmp/noteflow-ai"


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()


settings = get_settings()
