from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models import schemas
from app.repositories.daily_menu_repo import DailyMenuRepository

router = APIRouter(prefix="/menu", tags=["Daily Menu"])
repo = DailyMenuRepository()


@router.get("/today", response_model=list[schemas.DailyMenuResponse])
async def get_todays_menu(db: AsyncSession = Depends(get_db)):
    return await repo.get_by_day(db, date.today())


@router.post("/", response_model=schemas.DailyMenuResponse, status_code=status.HTTP_201_CREATED)
async def create_menu_item(
    name: str,
    price: Decimal,
    day: date,
    description: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    menu_in = schemas.DailyMenuCreate(name=name, price=price, description=description, day=day)
    return await repo.create(db, menu_in)
