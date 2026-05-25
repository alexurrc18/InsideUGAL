from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud import create_crud_router, ensure_exists
from app.models import models, schemas


async def validate_creator(payload: BaseModel, db: AsyncSession) -> None:
    created_by = getattr(payload, "created_by", None)
    await ensure_exists(db, models.Profile, created_by, "Creator profile not found.")


router = create_crud_router(
    model=models.Announcement,
    create_schema=schemas.AnnouncementCreate,
    update_schema=schemas.AnnouncementUpdate,
    response_schema=schemas.AnnouncementResponse,
    prefix="/announcements",
    tag="announcements",
    not_found_detail="Announcement not found.",
    validate_create=validate_creator,
    validate_update=validate_creator,
)
