from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Profile
from app.models.schemas import ProfileCreate, ProfileUpdate


class ProfileRepository:
    async def get_all(self, session: AsyncSession) -> list[Profile]:
        result = await session.execute(select(Profile))
        return list(result.scalars().all())

    async def get_by_id(
        self,
        session: AsyncSession,
        profile_id: UUID,  # Aici folosim UUID în loc de int
    ) -> Profile | None:
        result = await session.execute(select(Profile).where(Profile.id == profile_id))
        return result.scalars().first()

    async def create(self, session: AsyncSession, profile_in: ProfileCreate) -> Profile:
        db_profile = Profile(**profile_in.model_dump())
        
        session.add(db_profile)
        await session.commit()
        await session.refresh(db_profile)
        
        return db_profile

    async def update(self, session: AsyncSession, db_profile: Profile, profile_in: ProfileUpdate) -> Profile:
        update_data = profile_in.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(db_profile, key, value)
            
        await session.commit()
        await session.refresh(db_profile)
        
        return db_profile

    async def delete(self, session: AsyncSession, db_profile: Profile) -> None:
        await session.delete(db_profile)
        await session.commit()