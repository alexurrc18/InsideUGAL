from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Location
from app.models.schemas import LocationCreate, LocationUpdate


class LocationRepository:
    async def get_all(self, session: AsyncSession) -> list[Location]:
        result = await session.execute(select(Location))
        return list(result.scalars().all())

    async def get_by_id(
        self,
        session: AsyncSession,
        location_id: int,
    ) -> Location | None:
        result = await session.execute(select(Location).where(Location.id == location_id))
        return result.scalars().first()

    async def create(self, session: AsyncSession, location_in: LocationCreate) -> Location:
        db_location = Location(**location_in.model_dump())
        
        session.add(db_location)
        await session.commit()
        await session.refresh(db_location)
        
        return db_location

    async def update(self, session: AsyncSession, db_location: Location, location_in: LocationUpdate) -> Location:
        update_data = location_in.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(db_location, key, value)
            
        await session.commit()
        await session.refresh(db_location)
        
        return db_location

    async def delete(self, session: AsyncSession, db_location: Location) -> None:
        await session.delete(db_location)
        await session.commit()