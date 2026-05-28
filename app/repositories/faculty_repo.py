from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Faculty
from app.models.schemas import FacultyCreate, FacultyUpdate


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

    async def create(self, session: AsyncSession, faculty_in: FacultyCreate) -> Faculty:
        # Transformăm Pydantic schema în model SQLAlchemy
        db_faculty = Faculty(**faculty_in.model_dump())
        
        session.add(db_faculty)
        await session.commit()
        await session.refresh(db_faculty)
        
        return db_faculty

    async def update(self, session: AsyncSession, db_faculty: Faculty, faculty_in: FacultyUpdate) -> Faculty:
        # Preluăm doar câmpurile care au fost trimise efectiv
        update_data = faculty_in.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(db_faculty, key, value)
            
        await session.commit()
        await session.refresh(db_faculty)
        
        return db_faculty

    async def delete(self, session: AsyncSession, db_faculty: Faculty) -> None:
        await session.delete(db_faculty)
        await session.commit()