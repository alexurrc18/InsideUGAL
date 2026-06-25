from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Announcement, Profile
from app.models.schemas import AnnouncementCreate, AnnouncementUpdate, UserRole
from app.repositories.base import CRUDRepository, schema_to_data


class AnnouncementRepository(CRUDRepository[Announcement]):
    model = Announcement
    admin_roles = {UserRole.HEAD_ADMIN.value, UserRole.HEAD_FACULTATI.value}

    def _apply_visibility_filter(self, query, current_profile: Profile | None):
        if current_profile is None or current_profile.role in self.admin_roles:
            return query

        return query.where(
            or_(
                Announcement.faculty_id.is_(None),
                Announcement.faculty_id == current_profile.faculty_id,
            )
        )

    async def get_all(
        self,
        session: AsyncSession,
        announcement_type: str | None = None,
        faculty_id: int | None = None,
        current_profile: Profile | None = None,
    ) -> list[Announcement]:
        query = select(Announcement).order_by(Announcement.created_at.desc())
        if announcement_type is not None:
            query = query.where(Announcement.type == announcement_type)
        if faculty_id is not None:
            query = query.where(Announcement.faculty_id == faculty_id)
        query = self._apply_visibility_filter(query, current_profile)

        result = await session.execute(query)
        return list(result.scalars().all())

    async def get_page(
        self,
        session: AsyncSession,
        *,
        limit: int,
        offset: int,
        announcement_type: str | None = None,
        faculty_id: int | None = None,
        current_profile: Profile | None = None,
    ) -> tuple[list[Announcement], int]:
        query = select(Announcement).order_by(Announcement.created_at.desc())
        if announcement_type is not None:
            query = query.where(Announcement.type == announcement_type)
        if faculty_id is not None:
            query = query.where(Announcement.faculty_id == faculty_id)
        query = self._apply_visibility_filter(query, current_profile)

        total_result = await session.execute(select(func.count()).select_from(query.order_by(None).subquery()))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        return list(result.scalars().all()), total

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
