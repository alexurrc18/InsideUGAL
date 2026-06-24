from app.models.models import FacilitySchedule
from app.repositories.base import CRUDRepository


class FacilityScheduleRepository(CRUDRepository[FacilitySchedule]):
    model = FacilitySchedule
