from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Facility
from app.repositories.base import CRUDRepository


class FacilityRepository(CRUDRepository[Facility]):
    model = Facility

    @staticmethod
    def _load_options():
        return (
            selectinload(Facility.schedules),
            selectinload(Facility.locations),
        )

    async def get_page(self, session: AsyncSession, *, limit: int, offset: int) -> tuple[list[Facility], int]:
        query = select(Facility).options(*self._load_options()).order_by(Facility.name.asc())
        return await self.paginate(session, query, limit=limit, offset=offset)

    async def get_by_id(self, session: AsyncSession, entity_id: Any) -> Facility | None:
        result = await session.execute(
            select(Facility)
            .options(*self._load_options())
            .where(Facility.id == entity_id)
        )
        return result.scalars().first()
