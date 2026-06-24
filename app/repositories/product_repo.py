from typing import Any

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Product
from app.repositories.base import CRUDRepository


class ProductRepository(CRUDRepository[Product]):
    model = Product

    async def get_page(self, session: AsyncSession, *, limit: int, offset: int) -> tuple[list[Product], int]:
        query = select(Product).options(selectinload(Product.category)).order_by(Product.id)
        return await self.paginate(session, query, limit=limit, offset=offset)

    async def get_by_id(self, session: AsyncSession, entity_id: Any) -> Product | None:
        result = await session.execute(
            select(Product)
            .options(selectinload(Product.category))
            .where(Product.id == entity_id)
        )
        return result.scalars().first()

    async def create(self, session: AsyncSession, entity_in: BaseModel, **extra_data: Any) -> Product:
        product = await super().create(session, entity_in, **extra_data)
        loaded_product = await self.get_by_id(session, product.id)
        return loaded_product or product

    async def update(
        self,
        session: AsyncSession,
        db_entity: Product,
        entity_in: BaseModel,
        **extra_data: Any,
    ) -> Product:
        product = await super().update(session, db_entity, entity_in, **extra_data)
        loaded_product = await self.get_by_id(session, product.id)
        return loaded_product or product
