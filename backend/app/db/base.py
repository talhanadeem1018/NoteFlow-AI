"""Re-export the SQLAlchemy Base so Alembic can discover all models."""

from app.models.base import Base  # noqa: F401

# Import all models so Alembic autogenerate can discover them
import app.models.user  # noqa: F401
import app.models.transcript  # noqa: F401
import app.models.note  # noqa: F401
import app.models.processing_job  # noqa: F401


__all__ = ["Base"]
