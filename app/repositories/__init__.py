from sqlalchemy.orm import Session
from app.repositories.base_repo import BaseRepository
from app.models.profile import Profile # Asigură-te că importul e corect

class ProfileRepository(BaseRepository[Profile]):
    def __init__(self, db: Session):
        super().__init__(Profile, db)
