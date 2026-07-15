"""Quick database connection test."""
import asyncio
from sqlalchemy import text
from app.db.session import engine


async def test():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        print("Connection OK:", result.scalar())
    await engine.dispose()
    print("Database connection successful!")


asyncio.run(test())
