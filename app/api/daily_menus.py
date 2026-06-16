from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import schemas
from app.repositories.daily_menu_repo import DailyMenuRepository

router = APIRouter(prefix="/daily-menus", tags=["DailyMenus"])
repo = DailyMenuRepository()
manage_menus = require_roles(schemas.UserRole.HEAD_ADMIN, schemas.UserRole.HEAD_CANTINA)


@router.get("/", response_model=schemas.PaginatedResponse[schemas.DailyMenuResponse])
async def read_daily_menus(
    day_of_week: int | None = None,
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await repo.get_page(
        session,
        limit=pagination.size,
        offset=pagination.offset,
        day_of_week=day_of_week,
    )
    return paginated_response(items, total, pagination)


@router.get("/{menu_id}", response_model=schemas.DailyMenuResponse)
async def read_daily_menu(menu_id: int, session: AsyncSession = Depends(get_db)):
    menu = await repo.get_by_id(session, menu_id)
    if not menu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily menu not found.")
    return menu


@router.post("/", response_model=schemas.DailyMenuResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_menu(
    menu_in: schemas.DailyMenuCreate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_menus),
):
    try:
        return await repo.create(session, menu_in)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except IntegrityError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Daily menu already exists.") from exc


@router.patch("/{menu_id}", response_model=schemas.DailyMenuResponse)
async def update_daily_menu(
    menu_id: int,
    menu_in: schemas.DailyMenuUpdate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_menus),
):
    menu = await repo.get_by_id(session, menu_id)
    if not menu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily menu not found.")
    try:
        return await repo.update(session, menu, menu_in)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_menu(
    menu_id: int,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_menus),
):
    menu = await repo.get_by_id(session, menu_id)
    if not menu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily menu not found.")
    await repo.delete(session, menu)
