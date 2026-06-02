from app.models.models import Product
from app.repositories.base import CRUDRepository


class ProductRepository(CRUDRepository[Product]):
    model = Product
