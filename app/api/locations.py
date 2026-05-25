from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud import create_crud_router, ensure_exists
from app.models import models, schemas


async def validate_faculty(payload: BaseModel, db: AsyncSession) -> None:
    faculty_id = getattr(payload, "faculty_id", None)
    await ensure_exists(db, models.Faculty, faculty_id, "Faculty not found.")


router = create_crud_router(
    model=models.Location,
    create_schema=schemas.LocationCreate,
    update_schema=schemas.LocationUpdate,
    response_schema=schemas.LocationResponse,
    prefix="/locations",
    tag="locations",
    not_found_detail="Location not found.",
    validate_create=validate_faculty,
    validate_update=validate_faculty,
)
