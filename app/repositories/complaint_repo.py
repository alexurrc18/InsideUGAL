from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Complaint
from app.models.schemas import ComplaintCreate
from app.repositories.base import CRUDRepository


class ComplaintRepository(CRUDRepository[Complaint]):
    model = Complaint

    async def get_all(
        self,
        session: AsyncSession,
        status: str | None = None,
        location_id: int | None = None,
        user_id: str | None = None,
    ) -> list[Complaint]:
        query = select(Complaint).order_by(Complaint.created_at.desc())

        if status is not None:
            query = query.where(Complaint.status == status)
        if location_id is not None:
            query = query.where(Complaint.location_id == location_id)
        if user_id is not None:
            query = query.where(Complaint.user_id == user_id)

        result = await session.execute(query)
        return list(result.scalars().all())

    async def get_page(
        self,
        session: AsyncSession,
        *,
        limit: int,
        offset: int,
        status: str | None = None,
        location_id: int | None = None,
        user_id: str | None = None,
    ) -> tuple[list[Complaint], int]:
        query = select(Complaint).order_by(Complaint.created_at.desc())

        if status is not None:
            query = query.where(Complaint.status == status)
        if location_id is not None:
            query = query.where(Complaint.location_id == location_id)
        if user_id is not None:
            query = query.where(Complaint.user_id == user_id)

        total_result = await session.execute(select(func.count()).select_from(query.order_by(None).subquery()))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        return list(result.scalars().all()), total

    async def create_for_user(self, session: AsyncSession, complaint_in: ComplaintCreate, user_id: str) -> Complaint:
        return await self.create(session, complaint_in, user_id=user_id)
