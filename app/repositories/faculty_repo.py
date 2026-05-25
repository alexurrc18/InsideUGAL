from sqlalchemy.orm import Session
from app.repositories.base_repo import BaseRepository
from app.models.faculty import Faculty

class FacultyRepository(BaseRepository[Faculty]):
    def __init__(self, db: Session):
        super().__init__(Faculty, db)
