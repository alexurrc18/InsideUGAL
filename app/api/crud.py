from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.api.auth_deps import get_current_user

ValidatePayload = Callable[[BaseModel, AsyncSession], Awaitable[None]]


def create_crud_router(
    *,
    model: Any,
    create_schema: type[BaseModel],
    update_schema: type[BaseModel],
    response_schema: type[BaseModel],
    prefix: str,
    tag: str,
    id_field: str = "id",
    id_type: type = int,
    not_found_detail: str,
    validate_create: ValidatePayload | None = None,
    validate_update: ValidatePayload | None = None,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])

    def parse_id(raw_id: str) -> Any:
        try:
            return UUID(raw_id) if id_type is UUID else id_type(raw_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid {id_field}.",
            ) from exc

    @router.post("/", response_model=response_schema, status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_user)])
    async def create_item(
        payload: create_schema,  # type: ignore[arg-type]
        db: AsyncSession = Depends(get_db)
    ):
        if validate_create:
            await validate_create(payload, db)

        db_item = model(**payload.model_dump())
        db.add(db_item)
        await db.commit()
        await db.refresh(db_item)
        return db_item

    @router.get("/", response_model=list[response_schema])  # type: ignore[valid-type]
    async def list_items(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(model).offset(skip).limit(limit))
        return result.scalars().all()

    @router.get("/{item_id}", response_model=response_schema)
    async def get_item(item_id: str, db: AsyncSession = Depends(get_db)):  # type: ignore[valid-type]
        db_item = await _get_or_404(db, model, id_field, parse_id(item_id), not_found_detail)
        return db_item

    @router.put("/{item_id}", response_model=response_schema, dependencies=[Depends(get_current_user)])
    async def update_item(
        item_id: str,
        payload: update_schema,  # type: ignore[arg-type]
        db: AsyncSession = Depends(get_db)
    ):
        if validate_update:
            await validate_update(payload, db)

        db_item = await _get_or_404(db, model, id_field, parse_id(item_id), not_found_detail)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(db_item, field, value)

        await db.commit()
        await db.refresh(db_item)
        return db_item

    @router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_item(
        item_id: str,
        db: AsyncSession = Depends(get_db),
        current_user_id: str = Depends(get_current_user)
    ):
        db_item = await _get_or_404(db, model, id_field, parse_id(item_id), not_found_detail)
        await db.delete(db_item)
        await db.commit()
        return None

    return router


async def _get_or_404(
    db: AsyncSession,
    model: Any,
    id_field: str,
    item_id: Any,
    detail: str,
) -> Any:
    result = await db.execute(select(model).where(getattr(model, id_field) == item_id))
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return db_item


async def ensure_exists(
    db: AsyncSession,
    model: Any,
    item_id: Any,
    detail: str,
    *,
    id_field: str = "id",
) -> None:
    if item_id is None:
        return

    result = await db.execute(select(model).where(getattr(model, id_field) == item_id))
    if not result.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)