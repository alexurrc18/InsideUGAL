from app.models.models import ProductCategory
from app.repositories.base import CRUDRepository


class ProductCategoryRepository(CRUDRepository[ProductCategory]):
    model = ProductCategory
