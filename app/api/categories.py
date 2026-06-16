from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_admin
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import schemas
from app.repositories.category_repo import CategoryRepository

router = APIRouter(prefix="/categories", tags=["Categories"])
repo = CategoryRepository()


@router.get("/", response_model=schemas.PaginatedResponse[schemas.CategoryResponse])
async def read_categories(
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    return paginated_response(items, total, pagination)


@router.get("/{category_id}", response_model=schemas.CategoryResponse)
async def read_category(category_id: int, session: AsyncSession = Depends(get_db)):
    category = await repo.get_by_id(session, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    return category


@router.post("/", response_model=schemas.CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: schemas.CategoryCreate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    return await repo.create(session, category_in)


@router.patch("/{category_id}", response_model=schemas.CategoryResponse)
async def update_category(
    category_id: int,
    category_in: schemas.CategoryUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    category = await repo.get_by_id(session, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    return await repo.update(session, category, category_in)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    category = await repo.get_by_id(session, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    await repo.delete(session, category)
