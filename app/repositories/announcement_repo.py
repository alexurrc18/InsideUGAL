from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Announcement
from app.models.schemas import AnnouncementCreate, AnnouncementUpdate


class AnnouncementRepository:
    async def get_all(self, session: AsyncSession) -> list[Announcement]:
        result = await session.execute(select(Announcement))
        return list(result.scalars().all())

    async def get_by_id(
        self,
        session: AsyncSession,
        announcement_id: int,
    ) -> Announcement | None:
        result = await session.execute(select(Announcement).where(Announcement.id == announcement_id))
        return result.scalars().first()

    async def create(self, session: AsyncSession, announcement_in: AnnouncementCreate) -> Announcement:
        db_announcement = Announcement(**announcement_in.model_dump())
        
        session.add(db_announcement)
        await session.commit()
        await session.refresh(db_announcement)
        
        return db_announcement

    async def update(self, session: AsyncSession, db_announcement: Announcement, announcement_in: AnnouncementUpdate) -> Announcement:
        update_data = announcement_in.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(db_announcement, key, value)
            
        await session.commit()
        await session.refresh(db_announcement)
        
        return db_announcement

    async def delete(self, session: AsyncSession, db_announcement: Announcement) -> None:
        await session.delete(db_announcement)
        await session.commit()