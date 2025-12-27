"""
Main FastAPI application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings
from .core.database import create_db_and_tables
from .api.routes import health_router, groups_router

settings = get_settings()

# FastAPI app instance
app = FastAPI(
    title=settings.app_name,
    description="REST API für die Koordination von Gruppenreisen",
    version=settings.app_version
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

# Startup event
@app.on_event("startup")
async def on_startup():
    """Initialize database on startup"""
    await create_db_and_tables()

# For module execution
def run_server():
    """Run the server when called as module"""
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    run_server()