from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import schemas
from app.repositories.daily_menu_repo import DailyMenuRepository

router = APIRouter(prefix="/cafeteria_menus", tags=["Cafeteria Menus"])
repo = DailyMenuRepository()


@router.get("/", response_model=schemas.PaginatedResponse[schemas.DailyMenuResponse])
async def read_cafeteria_menus(
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
