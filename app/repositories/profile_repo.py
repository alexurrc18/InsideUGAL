from app.models.models import Profile
from app.repositories.base import CRUDRepository


class ProfileRepository(CRUDRepository[Profile]):
    model = Profile
