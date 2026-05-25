from sqlalchemy.orm import Session
from app.repositories.base_repo import BaseRepository
from app.models.student import Student

class StudentRepository(BaseRepository[Student]):
    def __init__(self, db: Session):
        super().__init__(Student, db)

    def get_by_student_id(self, student_id: str):
        return self.db.query(Student).filter(Student.student_id == student_id).first()
