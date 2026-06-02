from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models import schemas
from app.repositories.daily_menu_repo import DailyMenuRepository

router = APIRouter(prefix="/cafeteria_menus", tags=["Cafeteria Menus"])
repo = DailyMenuRepository()


@router.get("/", response_model=list[schemas.DailyMenuResponse])
async def read_cafeteria_menus(day_of_week: int | None = None, session: AsyncSession = Depends(get_db)):
    return await repo.get_all(session, day_of_week=day_of_week)
