from sqlalchemy.orm import Session
from typing import TypeVar, Type, Generic, List, Optional

T = TypeVar("T")

class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id: int) -> Optional[T]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def list(self) -> List[T]:
        return self.db.query(self.model).all()

    def create(self, obj_in) -> T:
        db_obj = self.model(**obj_in.dict())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, id: int, obj_in) -> Optional[T]:
        obj = self.get_by_id(id)
        if obj:
            for key, value in obj_in.dict().items():
                setattr(obj, key, value)
            self.db.commit()
            self.db.refresh(obj)
            return obj
        return None

    def delete(self, id: int) -> bool:
        obj = self.get_by_id(id)
        if obj:
            self.db.delete(obj)
            self.db.commit()
            return True
        return False
