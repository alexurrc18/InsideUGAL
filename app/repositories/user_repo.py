from sqlalchemy.orm import Session
from app.repositories.base_repo import BaseRepository
from app.models.user import User

class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str):
        return self.db.query(User).filter(User.email == email).first()
