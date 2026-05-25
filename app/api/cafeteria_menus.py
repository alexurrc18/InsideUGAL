from app.api.crud import create_crud_router
from app.models import models, schemas


router = create_crud_router(
    model=models.CafeteriaMenu,
    create_schema=schemas.CafeteriaMenuCreate,
    update_schema=schemas.CafeteriaMenuUpdate,
    response_schema=schemas.CafeteriaMenuResponse,
    prefix="/cafeteria_menus",
    tag="cafeteria_menus",
    not_found_detail="Cafeteria menu not found.",
)
