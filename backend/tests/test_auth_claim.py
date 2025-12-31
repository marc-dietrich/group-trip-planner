"""Actor claim flow tests are skipped for the MVP (authentication required for groups)."""

import pytest


pytest.skip("Actor/claim flow is disabled for the MVP", allow_module_level=True)
