import logging
from typing import List

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.auth_deps import require_roles, get_current_profile
from app.api.pagination import PaginationParams, paginated_response
from app.api.websocket_manager import notification_manager
from app.db.database import get_db
from app.models.models import Profile, PushToken
from app.models.schemas import NotificationCreate, NotificationResponse, PaginatedResponse, UserRole
from app.repositories.notification_repo import NotificationRepository

logger = logging.getLogger(__name__)

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
    pass


def _notification_payload(notification) -> dict:
    return NotificationResponse.model_validate(notification).model_dump(mode="json")


@router.websocket("/ws/{profile_id}")
async def notifications_websocket(websocket: WebSocket, profile_id: str):
    await notification_manager.connect(profile_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notification_manager.disconnect(profile_id, websocket)
    except Exception:
        logger.warning("WebSocket connection closed unexpectedly for profile %s", profile_id)
        notification_manager.disconnect(profile_id, websocket)


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
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
    websocket_payload = _notification_payload(notification)
    for target_profile in target_profiles:
        await notification_manager.send_notification_to_user(str(target_profile.id), websocket_payload)
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
