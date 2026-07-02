from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.model_translation_cache import (
    PRODUCT_CATEGORY_TRANSLATION,
    pretranslate_model_cache,
    translate_with_model_cache,
)
from app.api.pagination import PaginationParams, paginated_response
from app.api.products import manage_products
from app.db.database import get_db
from app.models import schemas
from app.repositories.product_category_repo import ProductCategoryRepository

router = APIRouter(prefix="/product_categories", tags=["Product Categories"])
repo = ProductCategoryRepository()


@router.get("/", response_model=schemas.PaginatedResponse[schemas.ProductCategoryResponse])
async def read_product_categories(
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    items = await translate_with_model_cache(items, lang, session, PRODUCT_CATEGORY_TRANSLATION)
    return paginated_response(items, total, pagination)


@router.get("/{category_id}", response_model=schemas.ProductCategoryResponse)
async def read_product_category(
    category_id: int,
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    session: AsyncSession = Depends(get_db),
):
    category = await repo.get_by_id(session, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product category not found.")
    return await translate_with_model_cache(category, lang, session, PRODUCT_CATEGORY_TRANSLATION)


@router.post("/", response_model=schemas.ProductCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_product_category(
    category_in: schemas.ProductCategoryCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_products),
):
    category = await repo.create(session, category_in)
    background_tasks.add_task(pretranslate_model_cache, category.id, PRODUCT_CATEGORY_TRANSLATION)
    return category


@router.patch("/{category_id}", response_model=schemas.ProductCategoryResponse)
async def update_product_category(
    category_id: int,
    category_in: schemas.ProductCategoryUpdate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_products),
):
    category = await repo.get_by_id(session, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product category not found.")
    updated_category = await repo.update(session, category, category_in)
    background_tasks.add_task(
        pretranslate_model_cache,
        updated_category.id,
        PRODUCT_CATEGORY_TRANSLATION,
        refresh_existing=True,
    )
    return updated_category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_category(
    category_id: int,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_products),
):
    category = await repo.get_by_id(session, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product category not found.")
    await repo.delete(session, category)
