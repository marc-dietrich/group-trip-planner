import os
from pathlib import Path

import pytest
import requests

BASE_URL = os.getenv("AUDIO_SERVICE_URL", "http://localhost:8011")
AUDIO_PATH = Path(__file__).resolve().parent / "audio" / "test.wav"


@pytest.mark.integration
@pytest.mark.timeout(120)
def test_transcribe_and_extract_availability():
    """Send the sample WAV to the running service and assert extracted range."""
    if not AUDIO_PATH.exists():
        pytest.skip(f"Sample audio not found at {AUDIO_PATH}")

    url = BASE_URL.rstrip("/") + "/transcribe"
    files = {"file": ("test.wav", AUDIO_PATH.open("rb"), "audio/wav")}
    data = {"userId": "test-user"}

    try:
        response = requests.post(url, files=files, data=data, timeout=90)
    except requests.exceptions.ConnectionError:
        pytest.skip(f"Audio service not reachable at {BASE_URL}")

    print(response)

    assert response.status_code == 200, response.text
    payload = response.json()
    print(payload)
    quit()

    assert payload.get("audioText", "").strip(), "Transcript is empty"
    transcript_lower = payload["audioText"].lower()
    # assert "verfügbar" in transcript_lower or "available" in transcript_lower

    availability = payload.get("availability", [])
    assert availability, "No availability ranges returned"

    start = availability[0].get("start", "")
    end = availability[0].get("end", "")
    assert start.endswith("-08-15"), f"Unexpected start date: {start}"
    assert end.endswith("-09-09"), f"Unexpected end date: {end}"
