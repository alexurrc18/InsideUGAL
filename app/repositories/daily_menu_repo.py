from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import DailyMenu
from app.models.schemas import DailyMenuCreate, DailyMenuUpdate
from app.repositories.base import CRUDRepository, schema_to_data


class DailyMenuRepository(CRUDRepository[DailyMenu]):
    model = DailyMenu

    async def get_all(self, session: AsyncSession, day: date | None = None) -> list[DailyMenu]:
        query = select(DailyMenu).order_by(DailyMenu.day.desc(), DailyMenu.id.asc())
        if day is not None:
            query = query.where(DailyMenu.day == day)

        result = await session.execute(query)
        return list(result.scalars().all())

    async def get_page(
        self,
        session: AsyncSession,
        *,
        limit: int,
        offset: int,
        day: date | None = None,
    ) -> tuple[list[DailyMenu], int]:
        query = select(DailyMenu).order_by(DailyMenu.day.desc(), DailyMenu.id.asc())
        count_query = select(DailyMenu)
        if day is not None:
            query = query.where(DailyMenu.day == day)
            count_query = count_query.where(DailyMenu.day == day)

        total_result = await session.execute(select(func.count()).select_from(count_query.subquery()))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        return list(result.scalars().all()), total

    async def get_by_id(self, session: AsyncSession, menu_id: int) -> DailyMenu | None:
        result = await session.execute(select(DailyMenu).where(DailyMenu.id == menu_id))
        return result.scalars().first()

    async def get_by_day(self, session: AsyncSession, day: date) -> list[DailyMenu]:
        result = await session.execute(
            select(DailyMenu)
            .where(DailyMenu.day == day)
            .order_by(DailyMenu.id.asc())
        )
        return list(result.scalars().all())

    async def create(self, session: AsyncSession, menu_in: DailyMenuCreate) -> DailyMenu:
        data = schema_to_data(menu_in)
        db_menu = DailyMenu(**data)

        session.add(db_menu)
        await session.commit()
        await session.refresh(db_menu)
        return db_menu

    async def update(self, session: AsyncSession, db_menu: DailyMenu, menu_in: DailyMenuUpdate) -> DailyMenu:
        data = schema_to_data(menu_in, exclude_unset=True)
        for key, value in data.items():
            setattr(db_menu, key, value)

        await session.commit()
        await session.refresh(db_menu)
        return db_menu
