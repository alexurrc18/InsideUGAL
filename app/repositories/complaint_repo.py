from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Complaint
from app.models.schemas import ComplaintCreate, ComplaintUpdate


class ComplaintRepository:
    async def get_all(
        self,
        session: AsyncSession,
        status: str | None = None,
        location_id: int | None = None,
    ) -> list[Complaint]:
        query = select(Complaint)

        if status is not None:
            query = query.where(Complaint.status == status)
        if location_id is not None:
            query = query.where(Complaint.location_id == location_id)

        result = await session.execute(query)
        return list(result.scalars().all())

    async def get_by_id(
        self,
        session: AsyncSession,
        complaint_id: int,
    ) -> Complaint | None:
        result = await session.execute(select(Complaint).where(Complaint.id == complaint_id))
        return result.scalars().first()

    async def create(self, session: AsyncSession, complaint_in: ComplaintCreate) -> Complaint:
        db_complaint = Complaint(**complaint_in.model_dump())
        
        session.add(db_complaint)
        await session.commit()
        await session.refresh(db_complaint)
        
        return db_complaint

    async def update(self, session: AsyncSession, db_complaint: Complaint, complaint_in: ComplaintUpdate) -> Complaint:
        update_data = complaint_in.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(db_complaint, key, value)
            
        await session.commit()
        await session.refresh(db_complaint)
        
        return db_complaint

    async def delete(self, session: AsyncSession, db_complaint: Complaint) -> None:
        await session.delete(db_complaint)
        await session.commit()
