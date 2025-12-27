"""
API routes module
"""

from .health import router as health_router
from .groups import router as groups_router

__all__ = ["health_router", "groups_router"]