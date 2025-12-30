"""
API routes module
"""

from .health import router as health_router
from .groups import router as groups_router
from .auth import router as auth_router
from .voice_mock import router as voice_mock_router
from .availabilities import router as availability_router

__all__ = ["health_router", "groups_router", "auth_router", "voice_mock_router", "availability_router"]