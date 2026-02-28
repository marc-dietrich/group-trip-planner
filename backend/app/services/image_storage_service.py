"""S3-compatible image processing and storage utilities."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from botocore.client import Config
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import Settings


ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MIME_ALIASES = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
    "image/x-png": "image/png",
}
UNKNOWN_MIME_TYPES = {"", "application/octet-stream", "binary/octet-stream"}
FORMAT_TO_MIME = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


@dataclass
class ProcessedImage:
    data: bytes
    mime_type: str
    extension: str
    width: int
    height: int

    @property
    def size_bytes(self) -> int:
        return len(self.data)


class ImageValidationError(ValueError):
    """Raised for invalid uploads or unprocessable images."""


class ImageStorageBackendError(RuntimeError):
    """Raised when S3-compatible storage backend is unavailable."""


class ImageStorageService:
    """Wraps image validation, resizing/compression, and S3 object operations."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.bucket = settings.storage_s3_bucket
        self._s3_client = boto3.client(
            "s3",
            endpoint_url=settings.storage_s3_endpoint,
            aws_access_key_id=settings.storage_s3_access_key,
            aws_secret_access_key=settings.storage_s3_secret_key,
            region_name=settings.storage_s3_region,
            use_ssl=settings.storage_s3_use_ssl,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    @staticmethod
    def _normalize_declared_mime(content_type: str | None) -> str:
        if not content_type:
            return ""
        base = content_type.split(";", 1)[0].strip().lower()
        return MIME_ALIASES.get(base, base)

    @staticmethod
    def validate_upload(content_type: str | None, payload: bytes, max_input_bytes: int) -> None:
        declared_mime = ImageStorageService._normalize_declared_mime(content_type)
        if declared_mime not in ALLOWED_MIME_TYPES and declared_mime not in UNKNOWN_MIME_TYPES:
            raise ImageValidationError("Unsupported MIME type. Allowed: image/jpeg, image/png, image/webp")
        if not payload:
            raise ImageValidationError("Uploaded file is empty")
        if len(payload) > max_input_bytes:
            raise ImageValidationError(f"File too large. Max input size is {max_input_bytes} bytes")

        try:
            with Image.open(BytesIO(payload)) as image:
                detected_mime = FORMAT_TO_MIME.get((image.format or "").upper())
        except UnidentifiedImageError as exc:
            raise ImageValidationError("Invalid image payload") from exc

        if not detected_mime or detected_mime not in ALLOWED_MIME_TYPES:
            raise ImageValidationError("Unsupported image encoding")

        if declared_mime in ALLOWED_MIME_TYPES and detected_mime != declared_mime:
            raise ImageValidationError("Declared MIME type does not match image content")

    @staticmethod
    def _encode_candidate(image: Image.Image, fmt: str, quality: int) -> bytes:
        buffer = BytesIO()
        if fmt == "WEBP":
            image.save(buffer, format="WEBP", quality=quality, method=6)
        else:
            image.save(buffer, format="JPEG", quality=quality, optimize=True, progressive=True)
        return buffer.getvalue()

    @classmethod
    def process_image(
        cls,
        raw_bytes: bytes,
        *,
        target_width: int,
        target_height: int,
        max_output_bytes: int,
    ) -> ProcessedImage:
        try:
            with Image.open(BytesIO(raw_bytes)) as source_image:
                source = source_image.convert("RGB")
        except UnidentifiedImageError as exc:
            raise ImageValidationError("Invalid image payload") from exc

        resized = ImageOps.fit(source, (target_width, target_height), method=Image.Resampling.LANCZOS)

        quality_steps = [85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35]
        best: tuple[str, int, bytes] | None = None

        for fmt in ("WEBP", "JPEG"):
            for quality in quality_steps:
                encoded = cls._encode_candidate(resized, fmt=fmt, quality=quality)
                if best is None or len(encoded) < len(best[2]):
                    best = (fmt, quality, encoded)
                if len(encoded) <= max_output_bytes:
                    mime = "image/webp" if fmt == "WEBP" else "image/jpeg"
                    ext = "webp" if fmt == "WEBP" else "jpg"
                    return ProcessedImage(
                        data=encoded,
                        mime_type=mime,
                        extension=ext,
                        width=target_width,
                        height=target_height,
                    )

        assert best is not None
        raise ImageValidationError(
            f"Could not compress image under {max_output_bytes} bytes (best={len(best[2])} bytes)"
        )

    @staticmethod
    def build_object_key(owner_type: str, extension: str) -> str:
        today = datetime.utcnow().strftime("%Y/%m/%d")
        return f"images/{owner_type}/{today}/{uuid4()}.{extension}"

    def put_object(self, *, key: str, payload: bytes, mime_type: str) -> None:
        try:
            self._s3_client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=payload,
                ContentType=mime_type,
                CacheControl="public, max-age=86400",
            )
        except (BotoCoreError, ClientError) as exc:
            raise ImageStorageBackendError("Object storage unavailable for write") from exc

    def get_object(self, *, key: str) -> tuple[bytes, str]:
        try:
            result = self._s3_client.get_object(Bucket=self.bucket, Key=key)
        except (BotoCoreError, ClientError) as exc:
            raise ImageStorageBackendError("Object storage unavailable for read") from exc
        content_type = result.get("ContentType") or "application/octet-stream"
        body = result["Body"].read()
        return body, content_type

    def delete_object(self, *, key: str) -> None:
        try:
            self._s3_client.delete_object(Bucket=self.bucket, Key=key)
        except (BotoCoreError, ClientError) as exc:
            raise ImageStorageBackendError("Object storage unavailable for delete") from exc

    def generate_presigned_get_url(self, *, key: str, expires_seconds: int = 300) -> str:
        try:
            return self._s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_seconds,
            )
        except (BotoCoreError, ClientError) as exc:
            raise ImageStorageBackendError("Object storage unavailable for presign") from exc
