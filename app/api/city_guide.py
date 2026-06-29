from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles
from app.api.crud import ensure_exists
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import models, schemas
from app.repositories.city_guide_repo import CityGuideCategoryRepository, CityGuideItemRepository

router = APIRouter(prefix="/city-guide", tags=["City Guide"])
category_repo = CityGuideCategoryRepository()
item_repo = CityGuideItemRepository()
manage_city_guide = require_roles(schemas.UserRole.HEAD_ADMIN)


async def validate_category(category_id: str | None, session: AsyncSession) -> None:
    if category_id is not None:
        await ensure_exists(
            session,
            models.CityGuideCategory,
            category_id,
            "City guide category not found.",
        )


@router.get("/categories", response_model=schemas.PaginatedResponse[schemas.CityGuideCategoryResponse])
async def read_city_guide_categories(
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await category_repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    return paginated_response(items, total, pagination)


@router.post("/categories", response_model=schemas.CityGuideCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_city_guide_category(
    category_in: schemas.CityGuideCategoryCreate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_city_guide),
):
    existing_category = await category_repo.get_by_id(session, category_in.id)
    if existing_category:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="City guide category already exists.")
    return await category_repo.create(session, category_in)


@router.patch("/categories/{category_id}", response_model=schemas.CityGuideCategoryResponse)
async def update_city_guide_category(
    category_id: str,
    category_in: schemas.CityGuideCategoryUpdate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_city_guide),
):
    category = await category_repo.get_by_id(session, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City guide category not found.")
    return await category_repo.update(session, category, category_in)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_city_guide_category(
    category_id: str,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_city_guide),
):
    category = await category_repo.get_by_id(session, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City guide category not found.")
    await category_repo.delete(session, category)


@router.get("/", response_model=schemas.PaginatedResponse[schemas.CityGuideItemResponse])
async def read_city_guide_items(
    category_id: str | None = None,
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    if category_id is not None:
        await validate_category(category_id, session)
        items, total = await item_repo.get_page_by_category(
            session,
            category_id,
            limit=pagination.size,
            offset=pagination.offset,
        )
    else:
        items, total = await item_repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    return paginated_response(items, total, pagination)


@router.post("/", response_model=schemas.CityGuideItemResponse, status_code=status.HTTP_201_CREATED)
async def create_city_guide_item(
    item_in: schemas.CityGuideItemCreate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_city_guide),
):
    await validate_category(item_in.category_id, session)
    return await item_repo.create(session, item_in)


@router.patch("/{item_id}", response_model=schemas.CityGuideItemResponse)
async def update_city_guide_item(
    item_id: int,
    item_in: schemas.CityGuideItemUpdate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_city_guide),
):
    item = await item_repo.get_by_id(session, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City guide item not found.")
    await validate_category(item_in.category_id, session)
    return await item_repo.update(session, item, item_in)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_city_guide_item(
    item_id: int,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_city_guide),
):
    item = await item_repo.get_by_id(session, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City guide item not found.")
    await item_repo.delete(session, item)
