from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles
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


@router.get("/", response_model=schemas.PaginatedResponse[schemas.ProductResponse])
async def read_products(
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    return paginated_response(items, total, pagination)


@router.get("/{product_id}", response_model=schemas.ProductResponse)
async def read_product(product_id: int, session: AsyncSession = Depends(get_db)):
    product = await repo.get_by_id(session, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return product


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
