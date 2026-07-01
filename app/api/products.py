from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles
from app.api.model_translation_cache import (
    PRODUCT_CATEGORY_TRANSLATION,
    PRODUCT_TRANSLATION,
    translate_with_model_cache,
)
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import schemas
from app.repositories.product_repo import ProductRepository

router = APIRouter(prefix="/products", tags=["Products"])
repo = ProductRepository()
manage_products = require_roles(
    schemas.UserRole.HEAD_ADMIN,
    schemas.UserRole.HEAD_CANTINA,
    schemas.UserRole.HEAD_FACULTATI
)


async def translate_product_response(payload, lang: str, session: AsyncSession):
    payload = await translate_with_model_cache(payload, lang, session, PRODUCT_TRANSLATION)
    items = payload if isinstance(payload, list) else [payload]
    categories = [
        item.get("category")
        for item in items
        if isinstance(item, dict) and isinstance(item.get("category"), dict)
    ]
    if categories:
        await translate_with_model_cache(categories, lang, session, PRODUCT_CATEGORY_TRANSLATION)
    return payload


@router.get("/", response_model=schemas.PaginatedResponse[schemas.ProductResponse])
async def read_products(
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    items = await translate_product_response(items, lang, session)
    return paginated_response(items, total, pagination)


@router.get("/{product_id}", response_model=schemas.ProductResponse)
async def read_product(
    product_id: int,
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    session: AsyncSession = Depends(get_db),
):
    product = await repo.get_by_id(session, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return await translate_product_response(product, lang, session)


@router.post("/", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: schemas.ProductCreate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_products),
):
    return await repo.create(session, product_in)


@router.patch("/{product_id}", response_model=schemas.ProductResponse)
async def update_product(
    product_id: int,
    product_in: schemas.ProductUpdate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_products),
):
    product = await repo.get_by_id(session, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return await repo.update(session, product, product_in)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_products),
):
    product = await repo.get_by_id(session, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    await repo.delete(session, product)
