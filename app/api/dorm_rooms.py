from app.api.crud import create_crud_router
from app.models import models, schemas


router = create_crud_router(
    model=models.DormRoom,
    create_schema=schemas.DormRoomCreate,
    update_schema=schemas.DormRoomUpdate,
    response_schema=schemas.DormRoomResponse,
    prefix="/dorm_rooms",
    tag="dorm_rooms",
    not_found_detail="Dorm room not found.",
)
