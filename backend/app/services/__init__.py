"""Services for business logic.

This module keeps backward compatibility while the canonical implementations
live under app.user_core.services.
"""

from app.user_core.services import AuthService, GroupService

__all__ = ["AuthService", "GroupService"]