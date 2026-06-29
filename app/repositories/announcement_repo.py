from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.models import Announcement
from app.models.schemas import AnnouncementCreate, AnnouncementUpdate, UserRole
from app.repositories.base import CRUDRepository, schema_to_data


class AnnouncementRepository(CRUDRepository[Announcement]):
    model = Announcement
    admin_roles = {UserRole.HEAD_ADMIN.value, UserRole.HEAD_FACULTATI.value}

    @staticmethod
    def _with_author_name(announcement: Announcement) -> Announcement:
        creator = announcement.creator
        if creator is not None:
            announcement.author_name = f"{creator.first_name} {creator.last_name}".strip()
        else:
            announcement.author_name = None
        return announcement

    @staticmethod
    def _base_select():
        return select(Announcement).options(joinedload(Announcement.creator))

    async def get_all(
        self,
        session: AsyncSession,
        announcement_type: str | None = None,
    ) -> list[Announcement]:
        query = self._base_select().order_by(Announcement.created_at.desc())
        if announcement_type is not None:
            query = query.where(Announcement.type == announcement_type)

        result = await session.execute(query)
        return [self._with_author_name(announcement) for announcement in result.scalars().all()]

    async def get_page(
        self,
        session: AsyncSession,
        *,
        limit: int,
        offset: int,
        announcement_type: str | None = None,
    ) -> tuple[list[Announcement], int]:
        query = self._base_select().order_by(Announcement.created_at.desc())
        if announcement_type is not None:
            query = query.where(Announcement.type == announcement_type)

        total_result = await session.execute(select(func.count()).select_from(query.order_by(None).subquery()))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        return [self._with_author_name(n) for n in result.scalars().all()], total

    async def get_by_id(self, session: AsyncSession, entity_id: int) -> Announcement | None:
        result = await session.execute(self._base_select().where(Announcement.id == entity_id))
        announcement = result.scalars().first()
        return self._with_author_name(announcement) if announcement else None

    async def create_for_user(self, session: AsyncSession, announcement_in: AnnouncementCreate, user_id: str) -> Announcement:
        return await self.create(session, announcement_in, created_by=user_id)

    async def update(
        self,
        session: AsyncSession,
        db_announcement: Announcement,
        announcement_in: AnnouncementUpdate,
        **extra_data,
    ) -> Announcement:
        data = schema_to_data(announcement_in, exclude_unset=True)
        data.update(extra_data)

        announcement_type = data.get("type", db_announcement.type)
        if announcement_type == "NOUTATE":
            data["start_date"] = None
            data["end_date"] = None
            data["location_name"] = None
        elif announcement_type == "EVENIMENT":
            start_date = data.get("start_date", db_announcement.start_date)
            end_date = data.get("end_date", db_announcement.end_date)
            if start_date is None:
                raise ValueError("start_date is required for EVENIMENT announcements.")
            if end_date is not None and end_date < start_date:
                raise ValueError("end_date must be after start_date.")

        for key, value in data.items():
            setattr(db_announcement, key, value)

        await session.commit()
        await session.refresh(db_announcement)
        return db_announcement
