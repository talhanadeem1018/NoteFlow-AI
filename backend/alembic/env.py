"""Alembic environment – configured for async SQLAlchemy with Supabase PostgreSQL."""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.db.base import Base  # re-exports app.models.base.Base

# Alembic Config object
config = context.config

# NOTE: We intentionally do NOT use config.set_main_option() to set the URL
# because Python's configparser treats '%' as an interpolation character,
# which breaks Supabase pooler URLs that contain '%40' (URL-encoded '@').
# Instead, we create the engine directly from settings.DIRECT_URL below.

# Logging configuration from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData for autogenerate support – Alembic inspects this
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generates SQL without connecting)."""
    context.configure(
        url=settings.DIRECT_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with an explicit connection."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode using an async engine."""
    # Convert sync psycopg2 URL to async asyncpg URL for the engine
    async_url = settings.DIRECT_URL.replace('+psycopg2', '+asyncpg')
    connectable = create_async_engine(
        async_url,
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online migrations – delegates to async runner."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
