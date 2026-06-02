from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Announcement
from app.models.schemas import AnnouncementCreate, AnnouncementUpdate
from app.repositories.base import CRUDRepository, schema_to_data


class AnnouncementRepository(CRUDRepository[Announcement]):
    model = Announcement

    async def get_all(
        self,
        session: AsyncSession,
        announcement_type: str | None = None,
        faculty_id: int | None = None,
    ) -> list[Announcement]:
        query = select(Announcement).order_by(Announcement.created_at.desc())
        if announcement_type is not None:
            query = query.where(Announcement.type == announcement_type)
        if faculty_id is not None:
            query = query.where(Announcement.faculty_id == faculty_id)

        result = await session.execute(query)
        return list(result.scalars().all())

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
