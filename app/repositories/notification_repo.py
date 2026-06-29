from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.models import Notification, Profile
from app.models.schemas import NotificationCreate
from app.repositories.base import CRUDRepository, schema_to_data


class NotificationRepository(CRUDRepository[Notification]):
    model = Notification

    @staticmethod
    def _with_sender_name(notification: Notification) -> Notification:
        sender = notification.sent_by_profile
        if sender is not None:
            notification.sender_name = f"{sender.first_name} {sender.last_name}".strip()
        else:
            notification.sender_name = None
        return notification

    @staticmethod
    def _base_select():
        return select(Notification).options(joinedload(Notification.sent_by_profile), joinedload(Notification.faculty))

    async def get_page(
        self,
        session: AsyncSession,
        *,
        limit: int,
        offset: int,
        faculty_id: int | None = None,
    ) -> tuple[list[Notification], int]:
        query = self._base_select().order_by(Notification.sent_at.desc())
        if faculty_id is not None:
            query = query.where(Notification.faculty_id == faculty_id)

        total_result = await session.execute(select(func.count()).select_from(query.order_by(None).subquery()))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        return [self._with_sender_name(n) for n in result.scalars().all()], total

    async def get_for_user(
        self,
        session: AsyncSession,
        profile: Profile,
        limit: int,
        offset: int,
    ) -> tuple[list[Notification], int]:
        query = self._base_select().order_by(Notification.sent_at.desc())
        query = query.where(
            (Notification.faculty_id == profile.faculty_id) | (Notification.faculty_id.is_(None))
        )

        total_result = await session.execute(select(func.count()).select_from(query.order_by(None).subquery()))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        return [self._with_sender_name(n) for n in result.scalars().all()], total

    async def create_for_user(
        self,
        session: AsyncSession,
        notification_in: NotificationCreate,
        user_id: str,
        recipient_count: int = 0,
    ) -> Notification:
        data = schema_to_data(notification_in)
        data["sent_by"] = user_id
        data["recipient_count"] = recipient_count
        db_notification = self.model(**data)

        session.add(db_notification)
        await session.commit()
        await session.refresh(db_notification)
        return db_notification
