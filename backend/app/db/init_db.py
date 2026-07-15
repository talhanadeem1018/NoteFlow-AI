"""Database initialization – create all tables (dev convenience)."""

import logging

from sqlalchemy import text

from app.db.session import engine
from app.models.base import Base  # noqa: F401 – ensure all models are imported

logger = logging.getLogger(__name__)


async def create_tables() -> None:
    """Create all tables defined by SQLAlchemy models.

    This is a *dev convenience* – in production you should use Alembic
    migrations exclusively.
    """
    # Import all models so Base.metadata knows about them
    import app.models.user  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created successfully.")


async def verify_connection() -> bool:
    """Verify we can connect to the database with a simple SELECT 1."""
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as e:
        logger.error("Database connection failed: %s", e)
        return False
