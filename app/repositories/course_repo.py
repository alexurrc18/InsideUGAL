from sqlalchemy.orm import Session
from app.repositories.base_repo import BaseRepository
from app.models.course import Course

class CourseRepository(BaseRepository[Course]):
    def __init__(self, db: Session):
        super().__init__(Course, db)
