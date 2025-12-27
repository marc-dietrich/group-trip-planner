"""
Health check endpoints
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["health"])

class HealthCheck(BaseModel):
    status: str
    message: str
    version: str = "0.1.0"

@router.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint"""
    return HealthCheck(
        status="ok",
        message="Gruppen-Urlaubsplaner API läuft mit PostgreSQL"
    )