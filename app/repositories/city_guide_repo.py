from typing import Any

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import CityGuideCategory, CityGuideItem
from app.repositories.base import CRUDRepository


class CityGuideCategoryRepository(CRUDRepository[CityGuideCategory]):
    model = CityGuideCategory


class CityGuideItemRepository(CRUDRepository[CityGuideItem]):
    model = CityGuideItem

    async def get_page(self, session: AsyncSession, *, limit: int, offset: int) -> tuple[list[CityGuideItem], int]:
        query = select(CityGuideItem).options(selectinload(CityGuideItem.category)).order_by(CityGuideItem.id)
        return await self.paginate(session, query, limit=limit, offset=offset)

    async def get_by_id(self, session: AsyncSession, entity_id: Any) -> CityGuideItem | None:
        result = await session.execute(
            select(CityGuideItem)
            .options(selectinload(CityGuideItem.category))
            .where(CityGuideItem.id == entity_id)
        )
        return result.scalars().first()

    async def get_all_by_category(self, session: AsyncSession, category_id: str) -> list[CityGuideItem]:
        result = await session.execute(
            select(CityGuideItem)
            .options(selectinload(CityGuideItem.category))
            .where(CityGuideItem.category_id == category_id)
            .order_by(CityGuideItem.title.asc())
        )
        return list(result.scalars().all())

    async def get_page_by_category(
        self,
        session: AsyncSession,
        category_id: str,
        *,
        limit: int,
        offset: int,
    ) -> tuple[list[CityGuideItem], int]:
        query = (
            select(CityGuideItem)
            .options(selectinload(CityGuideItem.category))
            .where(CityGuideItem.category_id == category_id)
            .order_by(CityGuideItem.id)
        )
        return await self.paginate(session, query, limit=limit, offset=offset)

    async def create(self, session: AsyncSession, entity_in: BaseModel, **extra_data: Any) -> CityGuideItem:
        item = await super().create(session, entity_in, **extra_data)
        loaded_item = await self.get_by_id(session, item.id)
        return loaded_item or item

    async def update(
        self,
        session: AsyncSession,
        db_entity: CityGuideItem,
        entity_in: BaseModel,
        **extra_data: Any,
    ) -> CityGuideItem:
        item = await super().update(session, db_entity, entity_in, **extra_data)
        loaded_item = await self.get_by_id(session, item.id)
        return loaded_item or item
