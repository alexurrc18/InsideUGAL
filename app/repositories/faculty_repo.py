from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Faculty


class FacultyRepository:
    async def get_all(self, session: AsyncSession) -> list[Faculty]:
        result = await session.execute(select(Faculty))
        return list(result.scalars().all())

    async def get_by_id(
        self,
        session: AsyncSession,
        faculty_id: int,
    ) -> Faculty | None:
        result = await session.execute(select(Faculty).where(Faculty.id == faculty_id))
        return result.scalars().first()
