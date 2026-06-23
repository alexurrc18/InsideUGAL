from enum import Enum
from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.sql import Select
from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


def schema_to_data(schema: BaseModel, *, exclude_unset: bool = False) -> dict[str, Any]:
    data = schema.model_dump(exclude_unset=exclude_unset)
    for key, value in list(data.items()):
        if isinstance(value, Enum):
            data[key] = value.value
        elif isinstance(value, UUID):
            data[key] = str(value)
    return data


class CRUDRepository(Generic[ModelT]):
    model: type[ModelT]

    async def get_all(self, session: AsyncSession) -> list[ModelT]:
        result = await session.execute(select(self.model))
        return list(result.scalars().all())

    async def get_page(self, session: AsyncSession, *, limit: int, offset: int) -> tuple[list[ModelT], int]:
        query = select(self.model)
        return await self.paginate(session, query, limit=limit, offset=offset)

    async def paginate(
        self,
        session: AsyncSession,
        query: Select[tuple[ModelT]],
        *,
        limit: int,
        offset: int,
    ) -> tuple[list[ModelT], int]:
        total_result = await session.execute(select(func.count()).select_from(query.order_by(None).subquery()))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        return list(result.scalars().all()), total

    async def get_by_id(self, session: AsyncSession, entity_id: Any) -> ModelT | None:
        result = await session.execute(select(self.model).where(self.model.id == entity_id))  # type: ignore[attr-defined]
        return result.scalars().first()

    async def create(self, session: AsyncSession, entity_in: BaseModel, **extra_data: Any) -> ModelT:
        data = schema_to_data(entity_in)
        data.update(extra_data)
        db_entity = self.model(**data)

        session.add(db_entity)
        await session.commit()
        await session.refresh(db_entity)
        return db_entity

    async def update(self, session: AsyncSession, db_entity: ModelT, entity_in: BaseModel, **extra_data: Any) -> ModelT:
        data = schema_to_data(entity_in, exclude_unset=True)
        data.update(extra_data)
        for key, value in data.items():
            setattr(db_entity, key, value)

        await session.commit()
        await session.refresh(db_entity)
        return db_entity

    async def delete(self, session: AsyncSession, db_entity: ModelT) -> None:
        await session.delete(db_entity)
        await session.commit()
