"""Image upload and retrieval endpoints backed by S3-compatible object storage."""

from __future__ import annotations

import asyncio
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select

from app.api.deps import get_group_service, get_image_storage_service
from app.core.config import get_settings
from app.core.database import get_session
from app.core.security import Identity, get_identity, require_authenticated_identity
from app.services.image_storage_service import (
    ImageStorageService,
    ImageStorageBackendError,
    ImageValidationError,
)
from app.user_core.models import ImageAsset, User
from app.user_core.services import GroupService

router = APIRouter(prefix="/api", tags=["images"])
settings = get_settings()


def _parse_uuid(value: str | None) -> UUID | None:
    if not value:
        return None
    try:
        return UUID(value)
    except ValueError:
        return None


def _asset_payload(asset: ImageAsset) -> dict:
    return {
        "assetId": asset.id,
        "ownerType": asset.owner_type,
        "ownerUserId": asset.owner_user_id,
        "ownerGroupId": asset.owner_group_id,
        "bucket": asset.s3_bucket,
        "s3Key": asset.s3_key,
        "mimeType": asset.mime_type,
        "sizeBytes": asset.size_bytes,
        "width": asset.width,
        "height": asset.height,
        "uploadedAt": asset.created_at,
    }


async def _read_upload(upload_file: UploadFile) -> bytes:
    return await upload_file.read()


async def _store_processed_image(
    *,
    upload_file: UploadFile,
    storage: ImageStorageService,
    owner_type: str,
    target_width: int,
    target_height: int,
    max_output_bytes: int,
) -> tuple[str, str, int, int, int]:
    raw_payload = await _read_upload(upload_file)

    try:
        storage.validate_upload(
            content_type=upload_file.content_type,
            payload=raw_payload,
            max_input_bytes=settings.image_upload_max_input_bytes,
        )
        processed = await asyncio.to_thread(
            storage.process_image,
            raw_payload,
            target_width=target_width,
            target_height=target_height,
            max_output_bytes=max_output_bytes,
        )
    except ImageValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except ImageStorageBackendError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage temporarily unavailable",
        ) from exc

    object_key = storage.build_object_key(owner_type=owner_type, extension=processed.extension)
    try:
        await asyncio.to_thread(
            storage.put_object,
            key=object_key,
            payload=processed.data,
            mime_type=processed.mime_type,
        )
    except ImageStorageBackendError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage temporarily unavailable",
        ) from exc

    return object_key, processed.mime_type, processed.size_bytes, processed.width, processed.height


@router.post("/users/me/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    identity: Identity = Depends(require_authenticated_identity),
    storage: ImageStorageService = Depends(get_image_storage_service),
    session: AsyncSession = Depends(get_session),
):
    user_id = _parse_uuid(identity.user_id)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authenticated user id")

    object_key, mime_type, size_bytes, width, height = await _store_processed_image(
        upload_file=file,
        storage=storage,
        owner_type="user_profile",
        target_width=512,
        target_height=512,
        max_output_bytes=settings.profile_image_target_bytes,
    )
    existing_assets = await _load_user_assets(session, user_id)

    existing_user = await session.get(User, user_id)
    if not existing_user:
        session.add(User(id=user_id, display_name=identity.display_name, email=identity.email))

    asset = ImageAsset(
        owner_type="user_profile",
        owner_user_id=user_id,
        owner_group_id=None,
        s3_bucket=storage.bucket,
        s3_key=object_key,
        mime_type=mime_type,
        size_bytes=size_bytes,
        width=width,
        height=height,
        created_at=datetime.utcnow(),
    )
    await _replace_owner_assets(session=session, storage=storage, existing_assets=existing_assets, new_asset=asset)
    return _asset_payload(asset)


@router.post("/groups/{group_id}/image")
async def upload_group_image(
    group_id: UUID,
    file: UploadFile = File(...),
    actor_id: str | None = Header(default=None, alias="X-Actor-Id"),
    identity: Identity = Depends(get_identity),
    group_service: GroupService = Depends(get_group_service),
    storage: ImageStorageService = Depends(get_image_storage_service),
    session: AsyncSession = Depends(get_session),
):
    user_uuid = _parse_uuid(identity.user_id)
    resolved_actor = (actor_id or identity.user_id or "").strip() or None
    if not resolved_actor and not user_uuid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="actorId header required")

    member = await group_service.get_member_for_identity(group_id=group_id, actor_id=resolved_actor, user_id=user_uuid)
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a group member")

    object_key, mime_type, size_bytes, width, height = await _store_processed_image(
        upload_file=file,
        storage=storage,
        owner_type="group_image",
        target_width=1024,
        target_height=512,
        max_output_bytes=settings.group_image_target_bytes,
    )
    existing_assets = await _load_group_assets(session, group_id)

    asset = ImageAsset(
        owner_type="group_image",
        owner_user_id=None,
        owner_group_id=group_id,
        s3_bucket=storage.bucket,
        s3_key=object_key,
        mime_type=mime_type,
        size_bytes=size_bytes,
        width=width,
        height=height,
        created_at=datetime.utcnow(),
    )
    await _replace_owner_assets(session=session, storage=storage, existing_assets=existing_assets, new_asset=asset)
    return _asset_payload(asset)


@router.delete("/groups/{group_id}/image", status_code=204)
async def delete_group_image(
    group_id: UUID,
    actor_id: str | None = Header(default=None, alias="X-Actor-Id"),
    identity: Identity = Depends(get_identity),
    group_service: GroupService = Depends(get_group_service),
    storage: ImageStorageService = Depends(get_image_storage_service),
    session: AsyncSession = Depends(get_session),
):
    user_uuid = _parse_uuid(identity.user_id)
    resolved_actor = (actor_id or identity.user_id or "").strip() or None
    if not resolved_actor and not user_uuid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="actorId header required")

    member = await group_service.get_member_for_identity(group_id=group_id, actor_id=resolved_actor, user_id=user_uuid)
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a group member")

    assets = await _load_group_assets(session, group_id)
    if not assets:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group image not found")

    for asset in assets:
        try:
            await asyncio.to_thread(storage.delete_object, key=asset.s3_key)
        except ImageStorageBackendError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Image storage temporarily unavailable",
            ) from exc

    for asset in assets:
        await session.delete(asset)
    try:
        await session.commit()
    except SQLAlchemyError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete group image metadata",
        ) from exc
    return Response(status_code=204)


async def _load_latest_user_asset(session: AsyncSession, user_id: UUID) -> ImageAsset | None:
    stmt = (
        select(ImageAsset)
        .where(ImageAsset.owner_type == "user_profile", ImageAsset.owner_user_id == user_id)
        .order_by(desc(ImageAsset.created_at))
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalars().first()


async def _load_user_assets(session: AsyncSession, user_id: UUID) -> list[ImageAsset]:
    stmt = (
        select(ImageAsset)
        .where(ImageAsset.owner_type == "user_profile", ImageAsset.owner_user_id == user_id)
        .order_by(desc(ImageAsset.created_at))
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def _load_latest_group_asset(session: AsyncSession, group_id: UUID) -> ImageAsset | None:
    stmt = (
        select(ImageAsset)
        .where(ImageAsset.owner_type == "group_image", ImageAsset.owner_group_id == group_id)
        .order_by(desc(ImageAsset.created_at))
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalars().first()


async def _load_group_assets(session: AsyncSession, group_id: UUID) -> list[ImageAsset]:
    stmt = (
        select(ImageAsset)
        .where(ImageAsset.owner_type == "group_image", ImageAsset.owner_group_id == group_id)
        .order_by(desc(ImageAsset.created_at))
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def _replace_owner_assets(
    *,
    session: AsyncSession,
    storage: ImageStorageService,
    existing_assets: list[ImageAsset],
    new_asset: ImageAsset,
) -> None:
    for existing in existing_assets:
        if existing.s3_key == new_asset.s3_key:
            continue
        try:
            await asyncio.to_thread(storage.delete_object, key=existing.s3_key)
        except ImageStorageBackendError as exc:
            try:
                await asyncio.to_thread(storage.delete_object, key=new_asset.s3_key)
            except ImageStorageBackendError:
                pass
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Image storage temporarily unavailable",
            ) from exc

    for existing in existing_assets:
        await session.delete(existing)

    session.add(new_asset)
    try:
        await session.commit()
        await session.refresh(new_asset)
    except SQLAlchemyError as exc:
        await session.rollback()
        try:
            await asyncio.to_thread(storage.delete_object, key=new_asset.s3_key)
        except ImageStorageBackendError:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not persist image metadata",
        ) from exc


@router.get("/users/{user_id}/profile-image")
async def fetch_profile_image(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
    storage: ImageStorageService = Depends(get_image_storage_service),
):
    asset = await _load_latest_user_asset(session, user_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile image not found")

    try:
        body, content_type = await asyncio.to_thread(storage.get_object, key=asset.s3_key)
    except ImageStorageBackendError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage temporarily unavailable",
        ) from exc
    return Response(content=body, media_type=content_type)


@router.get("/groups/{group_id}/image")
async def fetch_group_image(
    group_id: UUID,
    session: AsyncSession = Depends(get_session),
    storage: ImageStorageService = Depends(get_image_storage_service),
):
    asset = await _load_latest_group_asset(session, group_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group image not found")

    try:
        body, content_type = await asyncio.to_thread(storage.get_object, key=asset.s3_key)
    except ImageStorageBackendError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage temporarily unavailable",
        ) from exc
    return Response(content=body, media_type=content_type)


@router.get("/images/{asset_id}/presigned")
async def get_presigned_download_url(
    asset_id: UUID,
    session: AsyncSession = Depends(get_session),
    storage: ImageStorageService = Depends(get_image_storage_service),
):
    asset = await session.get(ImageAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    try:
        url = await asyncio.to_thread(
            storage.generate_presigned_get_url,
            key=asset.s3_key,
            expires_seconds=300,
        )
    except ImageStorageBackendError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage temporarily unavailable",
        ) from exc
    return {"assetId": asset.id, "url": url, "expiresIn": 300}
