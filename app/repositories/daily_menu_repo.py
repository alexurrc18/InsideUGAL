from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import DailyMenu, Product
from app.models.schemas import DailyMenuCreate, DailyMenuUpdate
from app.repositories.base import CRUDRepository, schema_to_data


class DailyMenuRepository(CRUDRepository[DailyMenu]):
    model = DailyMenu

    async def get_all(self, session: AsyncSession, day_of_week: int | None = None) -> list[DailyMenu]:
        query = select(DailyMenu).options(selectinload(DailyMenu.products)).order_by(DailyMenu.day_of_week.asc())
        if day_of_week is not None:
            query = query.where(DailyMenu.day_of_week == day_of_week)

        result = await session.execute(query)
        return list(result.scalars().unique().all())

    async def get_by_id(self, session: AsyncSession, menu_id: int) -> DailyMenu | None:
        result = await session.execute(
            select(DailyMenu).options(selectinload(DailyMenu.products)).where(DailyMenu.id == menu_id)
        )
        return result.scalars().unique().first()

    async def _load_products(self, session: AsyncSession, product_ids: list[int]) -> list[Product]:
        if not product_ids:
            return []

        result = await session.execute(select(Product).where(Product.id.in_(product_ids)))
        products = list(result.scalars().all())
        found_ids = {product.id for product in products}
        missing_ids = sorted(set(product_ids) - found_ids)
        if missing_ids:
            raise ValueError(f"Products not found: {missing_ids}")
        return products

    async def create(self, session: AsyncSession, menu_in: DailyMenuCreate) -> DailyMenu:
        data = schema_to_data(menu_in)
        product_ids = data.pop("product_ids", [])
        db_menu = DailyMenu(**data)
        db_menu.products = await self._load_products(session, product_ids)

        session.add(db_menu)
        await session.commit()
        await session.refresh(db_menu, ["products"])
        return db_menu

    async def update(self, session: AsyncSession, db_menu: DailyMenu, menu_in: DailyMenuUpdate) -> DailyMenu:
        data = schema_to_data(menu_in, exclude_unset=True)
        product_ids = data.pop("product_ids", None)
        for key, value in data.items():
            setattr(db_menu, key, value)

        if product_ids is not None:
            db_menu.products = await self._load_products(session, product_ids)

        await session.commit()
        await session.refresh(db_menu, ["products"])
        return db_menu
