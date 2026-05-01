import json
import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import List, Optional

import whisper
from dateparser.search import search_dates
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from transformers import pipeline

# Basic logger for observability in container environments.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("audio_service")

WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "tiny")
NLP_MODEL_NAME = os.getenv("NLP_MODEL", "google/flan-t5-small")
ALLOWED_CONTENT_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/x-m4a",
    "audio/mp4",
    "audio/aac",
    "audio/webm",
    "audio/ogg",
}

PROMPT_TEMPLATE = (
    "You extract availability date ranges from short German or English phrases. "
    "Respond with JSON ONLY, no prose. Keys: userId (string), audioText (string), availability "
    "(list of objects with start and end, both in YYYY-MM-DD). If no dates, availability is an empty list. "
    "Assume the same calendar year if none is provided.\n\n"
    "Example 1 (German):\n"
    "Transcript: Ich bin vom 15. August bis 9. September verfügbar.\n"
    "Output: {{\"userId\": \"demo\", \"audioText\": \"Ich bin vom 15. August bis 9. September verfügbar.\", \"availability\": [{{\"start\": \"2025-08-15\", \"end\": \"2025-09-09\"}}]}}\n\n"
    "Example 2 (English):\n"
    "Transcript: I am available from June 2 to June 5.\n"
    "Output: {{\"userId\": \"demo\", \"audioText\": \"I am available from June 2 to June 5.\", \"availability\": [{{\"start\": \"2025-06-02\", \"end\": \"2025-06-05\"}}]}}\n\n"
    "Example 3 (Noisy German):\n"
    "Transcript: verfügt bei 15. August bis 9. September\n"
    "Output: {{\"userId\": \"demo\", \"audioText\": \"verfügt bei 15. August bis 9. September\", \"availability\": [{{\"start\": \"2025-08-15\", \"end\": \"2025-09-09\"}}]}}\n\n"
    "Now process the next transcript.\n"
    "User ID: {user_id}\n"
    "Transcript: {transcript}"
)

PROMPT_REPAIR_TEMPLATE = (
    "Return ONLY valid JSON (no markdown, no prose) with keys userId, audioText, availability(list of objects with start, end YYYY-MM-DD). "
    "If missing dates, availability=[]. Input transcript: {transcript}. userId={user_id}."
)


class AvailabilityWindow(BaseModel):
    start: str
    end: str


class AvailabilityResponse(BaseModel):
    userId: str = Field(alias="userId")
    audioText: str
    availability: List[AvailabilityWindow]

    class Config:
        populate_by_name = True


app = FastAPI(title="Audio Availability Microservice", version="0.1.0")


def _load_models():
    """Load Whisper Tiny and the small T5-family model on CPU."""
    logger.info("Loading Whisper model '%s' on CPU", WHISPER_MODEL_NAME)
    whisper_model = whisper.load_model(WHISPER_MODEL_NAME, device="cpu")

    logger.info("Loading NLP model '%s' on CPU", NLP_MODEL_NAME)
    nlp_pipe = pipeline(
        task="text2text-generation",
        model=NLP_MODEL_NAME,
        device=-1,
    )
    return whisper_model, nlp_pipe


@app.on_event("startup")
async def startup_event():
    whisper_model, nlp_pipe = _load_models()
    app.state.whisper_model = whisper_model
    app.state.nlp_pipe = nlp_pipe


def _transcribe_audio(temp_path: str, whisper_model=None) -> str:
    """Run Whisper transcription on the audio file and return cleaned text."""
    model = whisper_model or getattr(app.state, "whisper_model", None)
    if model is None:
        raise RuntimeError("Whisper model not loaded")

    result = model.transcribe(temp_path, fp16=False)
    text = result.get("text", "").strip()
    if not text:
        raise ValueError("Transcription produced empty text")
    return text


def _coerce_to_json(model_text: str, transcript: str, user_id: str) -> dict:
    """Try to turn model output into the target JSON shape without regex parsing."""
    cleaned = model_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        # Attempt a minimal salvage: take the first {...} block and normalize quotes.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        parsed = None
        if start != -1 and end != -1 and end > start:
            candidate = cleaned[start : end + 1]
            candidate = candidate.replace("'", '"')
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError:
                parsed = None

        if parsed is None:
            logger.warning("Model output not valid JSON; falling back to empty availability")
            parsed = {
                "userId": user_id,
                "audioText": transcript,
                "availability": [],
            }

    availability = []
    for item in parsed.get("availability", []) if isinstance(parsed, dict) else []:
        if not isinstance(item, dict):
            continue
        start = str(item.get("start", "")).strip()
        end = str(item.get("end", "")).strip()
        if start and end:
            availability.append({"start": start, "end": end})

    return {
        "userId": parsed.get("userId", user_id) if isinstance(parsed, dict) else user_id,
        "audioText": parsed.get("audioText", transcript) if isinstance(parsed, dict) else transcript,
        "availability": availability,
    }


def _fallback_dates_from_transcript(transcript: str) -> List[dict]:
    """Heuristic: extract first two date mentions from transcript using dateparser."""
    texts = [
        transcript,
        transcript.replace("bis", "to"),
        transcript.replace("bis", "until"),
    ]
    matches = None
    for txt in texts:
        matches = search_dates(
            txt,
            languages=["de", "en"],
            settings={"PREFER_DAY_OF_MONTH": "first"},
        )
        if matches:
            break
    if not matches:
        return []

    # Collect unique date order
    seen = []
    for _, dt in matches:
        day = dt.date()
        if day not in seen:
            seen.append(day)
        if len(seen) >= 2:
            break

    if len(seen) < 2:
        return []

    start, end = seen[0], seen[1]
    if start > end:
        start, end = end, start

    return [{"start": start.isoformat(), "end": end.isoformat()}]


def _extract_availability(transcript: str, user_id: str, nlp_pipe=None) -> dict:
    """Use a small text-to-text model to map free-form text to structured availability."""
    pipe = nlp_pipe or getattr(app.state, "nlp_pipe", None)
    if pipe is None:
        raise RuntimeError("NLP model not loaded")

    prompts = [
        PROMPT_TEMPLATE.format(user_id=user_id, transcript=transcript),
        PROMPT_REPAIR_TEMPLATE.format(user_id=user_id, transcript=transcript),
    ]

    last_model_text = ""
    for prompt in prompts:
        outputs = pipe(
            prompt,
            max_new_tokens=256,
            min_new_tokens=32,
            num_beams=4,
            do_sample=False,
        )
        model_text = outputs[0]["generated_text"]
        last_model_text = model_text
        parsed = _coerce_to_json(model_text, transcript, user_id)
        if parsed.get("availability"):
            return parsed

    # Fallback heuristic using dateparser if model JSON failed.
    fallback_avail = _fallback_dates_from_transcript(transcript)
    if fallback_avail:
        return {
            "userId": user_id,
            "audioText": transcript,
            "availability": fallback_avail,
        }

    logger.warning("NLP model returned no availability; last output: %s", last_model_text)
    return _coerce_to_json(last_model_text, transcript, user_id)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/transcribe", response_model=AvailabilityResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    userId: Optional[str] = Form(None),
) -> AvailabilityResponse:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported media type")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    user_id = userId or str(uuid.uuid4())
    suffix = Path(file.filename or "uploaded").suffix or ".tmp"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(payload)
        temp_path = tmp.name

    try:
        transcript = _transcribe_audio(temp_path)
        structured = _extract_availability(transcript, user_id)
        return AvailabilityResponse(**structured)
    except ValueError as exc:
        logger.exception("Transcription failed: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error during processing: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            logger.warning("Temporary file cleanup failed for %s", temp_path)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
