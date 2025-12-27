"""
Database connection und session management
"""

from sqlmodel import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from .config import get_settings

settings = get_settings()

# Async engine for database operations
engine = create_async_engine(settings.database_url, echo=settings.debug)

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