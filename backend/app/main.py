"""Main FastAPI application."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings
from .core.database import create_db_and_tables
from .api.routes import auth_router, groups_router, health_router, voice_mock_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup/shutdown tasks for the app lifecycle."""
    # Only touch the database when a real connection string is provided
    if os.getenv("DATABASE_URL"):
        await create_db_and_tables()
    yield


# FastAPI app instance
app = FastAPI(
    title=settings.app_name,
    description="REST API für die Koordination von Gruppenreisen",
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(groups_router)
app.include_router(auth_router)
app.include_router(voice_mock_router)

# For module execution
def run_server():
    """Run the server when called as module"""
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    run_server()