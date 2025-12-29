from pathlib import Path

import pytest

import app

AUDIO_PATH = Path(__file__).resolve().parent / "audio" / "test.wav"


@pytest.fixture(scope="session")
def models():
    """Load models once per test session to keep runtime acceptable."""
    whisper_model, nlp_pipe = app._load_models()
    return whisper_model, nlp_pipe


def test_pipeline_on_sample_audio(models):
    whisper_model, nlp_pipe = models

    if not AUDIO_PATH.exists():
        pytest.skip(f"Sample audio not found at {AUDIO_PATH}")

    transcript = app._transcribe_audio(str(AUDIO_PATH), whisper_model=whisper_model)
    assert transcript.strip(), "Transcript is empty"

    structured = app._extract_availability(transcript, user_id="test-user", nlp_pipe=nlp_pipe)

    assert structured["audioText"].strip(), "audioText missing"
    availability = structured.get("availability", [])
    assert availability, "No availability parsed"

    start = availability[0].get("start", "")
    end = availability[0].get("end", "")
    assert start.endswith("-08-15"), f"Unexpected start date: {start}"
    assert end.endswith("-09-09"), f"Unexpected end date: {end}"
