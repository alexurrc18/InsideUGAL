from uuid import UUID

from app.api.crud import create_crud_router
from app.models import models, schemas


router = create_crud_router(
    model=models.Profile,
    create_schema=schemas.ProfileCreate,
    update_schema=schemas.ProfileUpdate,
    response_schema=schemas.ProfileResponse,
    prefix="/profiles",
    tag="profiles",
    id_type=UUID,
    not_found_detail="Profile not found.",
)
