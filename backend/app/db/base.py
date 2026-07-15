"""Re-export the SQLAlchemy Base so Alembic can discover all models."""

from app.models.base import Base  # noqa: F401

__all__ = ["Base"]
