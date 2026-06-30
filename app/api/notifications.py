import logging
import os
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.auth_deps import require_roles, get_current_profile
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models.models import Profile, PushToken
from app.models.schemas import NotificationCreate, NotificationResponse, PaginatedResponse, UserRole
from app.repositories.notification_repo import NotificationRepository

logger = logging.getLogger(__name__)

PUSH_SERVICE_URL = os.getenv("PUSH_SERVICE_URL")

router = APIRouter(prefix="/notifications", tags=["Notifications"])
repo = NotificationRepository()
send_notifications = require_roles(
    UserRole.HEAD_ADMIN,
    UserRole.HEAD_FACULTATI,
)


async def _get_target_profiles(db: AsyncSession, faculty_id: int | None) -> List[Profile]:
    query = select(Profile).options(joinedload(Profile.push_tokens)).where(Profile.is_active)

    if faculty_id is not None:
        query = query.where(Profile.faculty_id == faculty_id)

    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def _send_push(token: str, title: str, body: str, action: str | None) -> None:
    if not PUSH_SERVICE_URL:
        logger.warning("PUSH_SERVICE_URL not configured; skipping push notification.")
        raise RuntimeError("Push notification service is not configured.")

    payload = {"token": token, "title": title, "body": body}
    if action:
        payload["action"] = action

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(PUSH_SERVICE_URL, json=payload)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("Push notification failed with status %s: %s", exc.response.status_code, exc.response.text)
        raise RuntimeError(f"Push notification failed: {exc.response.status_code}") from exc
    except httpx.RequestError as exc:
        logger.error("Push notification request error: %s", exc)
        raise RuntimeError(f"Push notification request failed: {exc}") from exc


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    payload: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    profile: Profile = Depends(send_notifications),
):
    target_profiles = await _get_target_profiles(db, payload.faculty_id)

    sent_count = 0
    invalid_token_ids: List[int] = []
    for p in target_profiles:
        for token in p.push_tokens:
            if not token.is_valid:
                invalid_token_ids.append(token.id)
                continue
            try:
                await _send_push(token.token, payload.title, payload.body, payload.action)
                sent_count += 1
            except Exception:
                logger.warning("Push delivery failed for profile %s", p.id)
                invalid_token_ids.append(token.id)

    if invalid_token_ids:
        await db.execute(
            update(PushToken).where(PushToken.id.in_(invalid_token_ids)).values(is_valid=False)
        )
        await db.commit()

    notification = await repo.create_for_user(
        db, payload, user_id=str(profile.id), recipient_count=sent_count
    )
    await db.refresh(notification, attribute_names=["sent_by_profile", "faculty"])
    return notification


@router.get("/", response_model=PaginatedResponse[NotificationResponse])
async def read_notifications(
    faculty_id: int | None = None,
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    profile: Profile = Depends(require_roles(UserRole.HEAD_ADMIN)),
):
    items, total = await repo.get_page(
        db,
        limit=pagination.size,
        offset=pagination.offset,
        faculty_id=faculty_id,
    )
    return paginated_response(items, total, pagination)


@router.get("/me", response_model=PaginatedResponse[NotificationResponse])
async def read_my_notifications(
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    profile: Profile = Depends(get_current_profile),
):
    items, total = await repo.get_for_user(
        db,
        profile=profile,
        limit=pagination.size,
        offset=pagination.offset,
    )
    return paginated_response(items, total, pagination)
