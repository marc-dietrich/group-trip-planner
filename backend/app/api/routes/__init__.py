"""
API routes module
"""

from .health import router as health_router
from .groups import router as groups_router
from .auth import router as auth_router

__all__ = ["health_router", "groups_router", "auth_router"]