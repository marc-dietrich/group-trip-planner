import json
import socket
import urllib.error
import urllib.request
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
AUDIO_SAMPLE = ROOT_DIR / "services" / "audio-service" / "test" / "audio" / "test.wav"


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _http_json(method: str, url: str, payload: dict | None = None, timeout: float = 10.0):
    body = None
    headers = {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url=url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8") if response.length != 0 else ""
            parsed = json.loads(raw) if raw else None
            return response.status, response.headers, parsed
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8") if exc.fp else ""
        parsed = None
        if raw:
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = {"raw": raw}
        return exc.code, exc.headers, parsed


def test_caddy_starts_and_api_route_is_wired(full_stack) -> None:
    caddy_url = full_stack["caddy_base_url"]

    status, _, body = _http_json("GET", f"{caddy_url}/api/health")
    assert status == 200
    assert isinstance(body, dict)
    assert body.get("status") == "ok"


def test_contact_service_returns_contact_and_persists_message(full_stack) -> None:
    caddy_url = full_stack["caddy_base_url"]

    status, _, body = _http_json("GET", f"{caddy_url}/mail/contact")
    assert status == 200
    assert isinstance(body, dict)
    assert "email" in body

    marker = "service-test-contact-message"
    status, _, body = _http_json(
        "POST",
        f"{caddy_url}/mail/contact",
        payload={
            "message": marker,
            "actorId": "service-test-actor",
            "displayName": "Service Test",
            "replyTo": "test@example.com",
        },
    )
    assert status == 202
    assert body == {"ok": True, "stored": True}


def test_stripe_gets_requests_and_redirects(full_stack) -> None:
    caddy_url = full_stack["caddy_base_url"]
    stripe_url = full_stack["stripe_base_url"]

    status, _, body = _http_json("GET", f"{stripe_url}/health")
    assert status == 200
    assert body == {"status": "ok"}

    status, _, body = _http_json(
        "POST",
        f"{stripe_url}/create-checkout-session",
        payload={"amount": 0, "actorId": ""},
    )
    assert status == 400
    assert isinstance(body, dict)
    assert "error" in body

    opener = urllib.request.build_opener(_NoRedirect)
    request = urllib.request.Request(url=f"{caddy_url}/success", method="GET")
    try:
        opener.open(request, timeout=10)
        raise AssertionError("Expected redirect response from /success")
    except urllib.error.HTTPError as exc:
        assert exc.code in (301, 302, 303, 307, 308)
        location = exc.headers.get("Location", "")
        assert location.startswith("/supporter/thanks")


def test_storage_service_starts_and_ports_are_reachable(full_stack) -> None:
    garage_host = full_stack["garage_host"]
    for port in (int(full_stack["garage_s3_port"]), int(full_stack["garage_admin_port"])):
        with socket.create_connection((garage_host, port), timeout=5):
            pass


def test_audio_service_minimal_transcribe(full_stack) -> None:
    audio_url = full_stack["audio_base_url"]

    status, _, body = _http_json("GET", f"{audio_url}/health")
    assert status == 200
    assert body == {"status": "ok"}

    assert AUDIO_SAMPLE.exists(), f"Missing audio sample at {AUDIO_SAMPLE}"

    with AUDIO_SAMPLE.open("rb") as audio_file:
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        data_prefix = (
            f"--{boundary}\r\n"
            "Content-Disposition: form-data; name=\"userId\"\r\n\r\n"
            "test-user\r\n"
            f"--{boundary}\r\n"
            "Content-Disposition: form-data; name=\"file\"; filename=\"test.wav\"\r\n"
            "Content-Type: audio/wav\r\n\r\n"
        ).encode("utf-8")
        data_suffix = f"\r\n--{boundary}--\r\n".encode("utf-8")
        payload = data_prefix + audio_file.read() + data_suffix

    request = urllib.request.Request(
        url=f"{audio_url}/transcribe",
        data=payload,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        assert response.status == 200
        body = json.loads(response.read().decode("utf-8"))

    assert body.get("audioText", "").strip()
    availability = body.get("availability", [])
    assert availability
    assert availability[0].get("start", "").endswith("-08-15")
    assert availability[0].get("end", "").endswith("-09-09")
