from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import CafeteriaMenu
from app.models.schemas import CafeteriaMenuCreate, CafeteriaMenuUpdate


class CafeteriaMenuRepository:
    async def get_all(self, session: AsyncSession) -> list[CafeteriaMenu]:
        result = await session.execute(select(CafeteriaMenu))
        return list(result.scalars().all())

    async def get_by_id(
        self,
        session: AsyncSession,
        menu_id: int,
    ) -> CafeteriaMenu | None:
        result = await session.execute(select(CafeteriaMenu).where(CafeteriaMenu.id == menu_id))
        return result.scalars().first()

    async def create(self, session: AsyncSession, menu_in: CafeteriaMenuCreate) -> CafeteriaMenu:
        db_menu = CafeteriaMenu(**menu_in.model_dump())
        
        session.add(db_menu)
        await session.commit()
        await session.refresh(db_menu)
        
        return db_menu

    async def update(self, session: AsyncSession, db_menu: CafeteriaMenu, menu_in: CafeteriaMenuUpdate) -> CafeteriaMenu:
        update_data = menu_in.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(db_menu, key, value)
            
        await session.commit()
        await session.refresh(db_menu)
        
        return db_menu

    async def delete(self, session: AsyncSession, db_menu: CafeteriaMenu) -> None:
        await session.delete(db_menu)
        await session.commit()