"""
Database connection und session management
"""

from sqlmodel import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from .config import get_settings

settings = get_settings()

connect_args = {"ssl": "require"} if settings.database_ssl_require else {}

# Async engine for database operations
engine = create_async_engine(settings.database_url, echo=settings.debug, connect_args=connect_args)

# Session factory for dependency injection
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Database dependency for FastAPI
async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

# Helper function to create tables
async def create_db_and_tables():
    from sqlmodel import SQLModel
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        await conn.execute(
            text(
                """
                ALTER TABLE IF EXISTS groups
                    ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
                    ADD COLUMN IF NOT EXISTS history_after_days INT NOT NULL DEFAULT 30
                """
            )
        )
        await conn.execute(
            text(
                """
                UPDATE groups
                SET last_interaction_at = COALESCE(last_interaction_at, created_at)
                WHERE last_interaction_at IS NULL
                """
            )
        )
        await conn.execute(
            text(
                """
                UPDATE groups
                SET history_after_days = 30
                WHERE history_after_days IS NULL OR history_after_days < 1
                """
            )
        )