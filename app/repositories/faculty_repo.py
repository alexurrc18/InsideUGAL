from app.models.models import Faculty
from app.repositories.base import CRUDRepository


class FacultyRepository(CRUDRepository[Faculty]):
    model = Faculty
