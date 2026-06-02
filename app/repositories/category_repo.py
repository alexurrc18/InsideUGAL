from app.models.models import Category
from app.repositories.base import CRUDRepository


class CategoryRepository(CRUDRepository[Category]):
    model = Category
