from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud import create_crud_router, ensure_exists
from app.models import models, schemas


async def validate_complaint_refs(payload: BaseModel, db: AsyncSession) -> None:
    user_id = getattr(payload, "user_id", None)
    location_id = getattr(payload, "location_id", None)

    await ensure_exists(db, models.Profile, user_id, "Profile not found.")
    await ensure_exists(db, models.Location, location_id, "Location not found.")


router = create_crud_router(
    model=models.Complaint,
    create_schema=schemas.ComplaintCreate,
    update_schema=schemas.ComplaintUpdate,
    response_schema=schemas.ComplaintResponse,
    prefix="/complaints",
    tag="complaints",
    not_found_detail="Complaint not found.",
    validate_create=validate_complaint_refs,
    validate_update=validate_complaint_refs,
)
