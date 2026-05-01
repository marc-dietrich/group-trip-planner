import os
import socket
import time
import urllib.error
import urllib.request

import pytest


def _wait_http_status(url: str, accepted_statuses: set[int], timeout_seconds: float = 120.0) -> None:
    end = time.time() + timeout_seconds
    while time.time() < end:
        request = urllib.request.Request(url=url, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=4) as response:
                if response.status in accepted_statuses:
                    return
        except urllib.error.HTTPError as exc:
            if exc.code in accepted_statuses:
                return
        except Exception:  # noqa: BLE001
            pass
        time.sleep(1)
    raise AssertionError(f"Timeout waiting for {url} with statuses {sorted(accepted_statuses)}")


def _wait_tcp(host: str, port: int, timeout_seconds: float = 120.0) -> None:
    end = time.time() + timeout_seconds
    while time.time() < end:
        try:
            with socket.create_connection((host, port), timeout=2):
                return
        except OSError:
            time.sleep(1)
    raise AssertionError(f"Timeout waiting for TCP {host}:{port}")


@pytest.fixture(scope="session")
def full_stack() -> dict[str, str]:
    env = os.environ.copy()
    caddy_base_url = env.get("CADDY_BASE_URL", "http://caddy")
    backend_base_url = env.get("BACKEND_BASE_URL", "http://backend:8000")
    contact_base_url = env.get("CONTACT_BASE_URL", "http://contact-service:3002")
    stripe_base_url = env.get("STRIPE_BASE_URL", "http://stripe-service:3001")
    audio_base_url = env.get("AUDIO_BASE_URL", "http://audio-service:8000")
    oauth_base_url = env.get("OAUTH_BASE_URL", "http://oauth-proxy:4180")
    garage_host = env.get("GARAGE_HOST", "garage")
    garage_s3_port = int(env.get("GARAGE_S3_PORT", "3900"))
    garage_admin_port = int(env.get("GARAGE_ADMIN_PORT", "3901"))

    _wait_http_status("http://frontend/", {200, 301, 302})
    _wait_http_status(f"{backend_base_url}/api/health", {200})
    _wait_http_status(f"{contact_base_url}/health", {200})
    _wait_http_status(f"{stripe_base_url}/health", {200})
    _wait_http_status(f"{audio_base_url}/health", {200})
    _wait_http_status(f"{oauth_base_url}/oauth/auth", {200, 202, 302, 401, 403})
    _wait_http_status(f"{caddy_base_url}/api/health", {200})
    _wait_tcp(garage_host, garage_s3_port)
    _wait_tcp(garage_host, garage_admin_port)

    ctx = {
        "caddy_base_url": caddy_base_url,
        "backend_base_url": backend_base_url,
        "contact_base_url": contact_base_url,
        "stripe_base_url": stripe_base_url,
        "audio_base_url": audio_base_url,
        "garage_host": garage_host,
        "garage_s3_port": str(garage_s3_port),
        "garage_admin_port": str(garage_admin_port),
    }

    yield ctx
