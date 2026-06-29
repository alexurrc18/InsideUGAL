from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.models import Complaint
from app.models.schemas import ComplaintCreate
from app.repositories.base import CRUDRepository


class ComplaintRepository(CRUDRepository[Complaint]):
    model = Complaint

    @staticmethod
    def _with_author_name(complaint: Complaint) -> Complaint:
        user = complaint.user
        if user is not None:
            complaint.author_name = f"{user.first_name} {user.last_name}".strip()
        else:
            complaint.author_name = None
        return complaint

    @staticmethod
    def _base_select():
        return select(Complaint).options(joinedload(Complaint.user))

    async def get_all(
        self,
        session: AsyncSession,
        status: str | None = None,
        location_id: int | None = None,
        user_id: str | None = None,
    ) -> list[Complaint]:
        query = self._base_select().order_by(Complaint.created_at.desc())

        if status is not None:
            query = query.where(Complaint.status == status)
        if location_id is not None:
            query = query.where(Complaint.location_id == location_id)
        if user_id is not None:
            query = query.where(Complaint.user_id == user_id)

        result = await session.execute(query)
        return [self._with_author_name(complaint) for complaint in result.scalars().all()]

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
        query = self._base_select().order_by(Complaint.created_at.desc())

        if status is not None:
            query = query.where(Complaint.status == status)
        if location_id is not None:
            query = query.where(Complaint.location_id == location_id)
        if user_id is not None:
            query = query.where(Complaint.user_id == user_id)

        total_result = await session.execute(select(func.count()).select_from(query.order_by(None).subquery()))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        return [self._with_author_name(complaint) for complaint in result.scalars().all()], total

    async def get_by_id(self, session: AsyncSession, entity_id: int) -> Complaint | None:
        result = await session.execute(self._base_select().where(Complaint.id == entity_id))
        complaint = result.scalars().first()
        return self._with_author_name(complaint) if complaint else None

    async def create_for_user(self, session: AsyncSession, complaint_in: ComplaintCreate, user_id: str) -> Complaint:
        return await self.create(session, complaint_in, user_id=user_id)
