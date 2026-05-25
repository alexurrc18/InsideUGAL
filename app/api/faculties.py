from app.api.crud import create_crud_router
from app.models import models, schemas


router = create_crud_router(
    model=models.Faculty,
    create_schema=schemas.FacultyCreate,
    update_schema=schemas.FacultyUpdate,
    response_schema=schemas.FacultyResponse,
    prefix="/faculties",
    tag="faculties",
    not_found_detail="Faculty not found.",
)
