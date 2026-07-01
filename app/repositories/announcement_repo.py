from sqlalchemy import delete as sqlalchemy_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.models import Announcement, AnnouncementTranslation, Faculty
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
        return select(Announcement).options(
            joinedload(Announcement.creator),
            selectinload(Announcement.faculties),
        )

    async def _load_faculties(self, session: AsyncSession, faculty_ids: list[int]) -> list[Faculty]:
        if not faculty_ids:
            return []

        result = await session.execute(select(Faculty).where(Faculty.id.in_(faculty_ids)))
        faculties = list(result.scalars().all())
        found_ids = {faculty.id for faculty in faculties}
        missing_ids = set(faculty_ids) - found_ids
        if missing_ids:
            missing = ", ".join(str(faculty_id) for faculty_id in sorted(missing_ids))
            raise ValueError(f"Faculty id(s) not found: {missing}.")
        return faculties

    async def get_all(
        self,
        session: AsyncSession,
        announcement_type: str | None = None,
        lang: str | None = None,
    ) -> list[Announcement]:
        query = self._base_select().order_by(Announcement.created_at.desc())
        if announcement_type is not None:
            query = query.where(Announcement.type == announcement_type)

        result = await session.execute(query)
        announcements = [self._with_author_name(announcement) for announcement in result.scalars().all()]
        
        if lang and lang != "ro":
            for announcement in announcements:
                translation = await self.get_translation(session, announcement.id, lang)
                if translation:
                    announcement.title = translation.translated_title
                    announcement.content = translation.translated_content
                    announcement.is_translated = True
        return announcements

    async def get_page(
        self,
        session: AsyncSession,
        *,
        limit: int,
        offset: int,
        announcement_type: str | None = None,
        lang: str | None = None,
    ) -> tuple[list[Announcement], int]:
        query = self._base_select().order_by(Announcement.created_at.desc())
        if announcement_type is not None:
            query = query.where(Announcement.type == announcement_type)

        total_result = await session.execute(select(func.count()).select_from(query.order_by(None).subquery()))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        announcements = [self._with_author_name(n) for n in result.scalars().all()]
        
        if lang and lang != "ro":
            for announcement in announcements:
                translation = await self.get_translation(session, announcement.id, lang)
                if translation:
                    announcement.title = translation.translated_title
                    announcement.content = translation.translated_content
                    announcement.is_translated = True
        return announcements, total

    async def get_by_id(
        self,
        session: AsyncSession,
        entity_id: int,
        lang: str | None = None,
    ) -> Announcement | None:
        result = await session.execute(self._base_select().where(Announcement.id == entity_id))
        announcement = result.scalars().first()
        if not announcement:
            return None
        announcement = self._with_author_name(announcement)
        
        if lang and lang != "ro":
            translation = await self.get_translation(session, announcement.id, lang)
            if translation:
                announcement.title = translation.translated_title
                announcement.content = translation.translated_content
                announcement.is_translated = True
        return announcement

    async def create_for_user(self, session: AsyncSession, announcement_in: AnnouncementCreate, user_id: str) -> Announcement:
        data = schema_to_data(announcement_in)
        faculty_ids = data.pop("faculty_ids", None) or []
        data["created_by"] = user_id

        db_announcement = Announcement(**data)
        db_announcement.faculties = await self._load_faculties(session, faculty_ids)

        session.add(db_announcement)
        await session.commit()
        await session.refresh(db_announcement)
        return await self.get_by_id(session, db_announcement.id) or db_announcement

    async def delete(self, session: AsyncSession, db_announcement: Announcement) -> None:
        await session.execute(
            sqlalchemy_delete(Announcement)
            .where(Announcement.id == db_announcement.id)
            .execution_options(synchronize_session=False)
        )
        await session.commit()

    async def update(
        self,
        session: AsyncSession,
        db_announcement: Announcement,
        announcement_in: AnnouncementUpdate,
        **extra_data,
    ) -> Announcement:
        data = schema_to_data(announcement_in, exclude_unset=True)
        data.update(extra_data)
        has_faculty_update = "faculty_ids" in data
        faculty_ids = data.pop("faculty_ids", None) or []

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

        if has_faculty_update:
            db_announcement.faculties = await self._load_faculties(session, faculty_ids)

        await session.commit()
        await session.refresh(db_announcement)
        return await self.get_by_id(session, db_announcement.id) or db_announcement

    async def get_translation(
        self,
        session: AsyncSession,
        announcement_id: int,
        language_code: str,
    ) -> AnnouncementTranslation | None:
        result = await session.execute(
            select(AnnouncementTranslation).where(
                AnnouncementTranslation.announcement_id == announcement_id,
                AnnouncementTranslation.language_code == language_code,
            )
        )
        return result.scalars().first()

    async def save_translation(
        self,
        session: AsyncSession,
        announcement_id: int,
        language_code: str,
        translated_title: str,
        translated_content: str,
    ) -> AnnouncementTranslation:
        existing = await self.get_translation(session, announcement_id, language_code)
        if existing:
            existing.translated_title = translated_title
            existing.translated_content = translated_content
            await session.commit()
            await session.refresh(existing)
            return existing
        
        translation = AnnouncementTranslation(
            announcement_id=announcement_id,
            language_code=language_code,
            translated_title=translated_title,
            translated_content=translated_content,
        )
        session.add(translation)
        await session.commit()
        await session.refresh(translation)
        return translation
