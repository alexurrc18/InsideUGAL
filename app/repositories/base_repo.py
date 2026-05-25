from typing import TypeVar, Generic, Type, List, Optional
from sqlalchemy.orm import Session
from app.database import Base

# T este un tip generic pentru modelul tău (User, Student, etc.)
T = TypeVar("T", bound=Base)

class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id: int) -> Optional[T]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(self) -> List[T]:
        return self.db.query(self.model).all()

    def create(self, obj_in: dict) -> T:
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, id: int) -> bool:
        obj = self.get_by_id(id)
        if obj:
            self.db.delete(obj)
            self.db.commit()
            return True
        return False
