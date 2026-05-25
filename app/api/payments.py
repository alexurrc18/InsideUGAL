from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.crud import create_crud_router, ensure_exists
from app.models import models, schemas


async def validate_profile(payload: BaseModel, db: AsyncSession) -> None:
    user_id = getattr(payload, "user_id", None)
    await ensure_exists(db, models.Profile, user_id, "Profile not found.")


router = create_crud_router(
    model=models.Payment,
    create_schema=schemas.PaymentCreate,
    update_schema=schemas.PaymentUpdate,
    response_schema=schemas.PaymentResponse,
    prefix="/payments",
    tag="payments",
    not_found_detail="Payment not found.",
    validate_create=validate_profile,
    validate_update=validate_profile,
)
