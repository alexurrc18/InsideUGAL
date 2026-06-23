from app.models.models import Profile
from app.repositories.base import CRUDRepository
from app.models import schemas
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession


class ProfileRepository(CRUDRepository[Profile]):
    model = Profile

    async def upsert_from_create(
        self,
        session: AsyncSession,
        profile_in: schemas.ProfileCreate,
        *,
        profile_id: str,
    ) -> Profile:
        role = profile_in.role.value if hasattr(profile_in.role, "value") else profile_in.role
        values = {
            "id": profile_id,
            "username": profile_in.username,
            "first_name": profile_in.first_name,
            "last_name": profile_in.last_name,
            "email": profile_in.email,
            "role": role,
            "is_active": True,
        }

        stmt = (
            insert(Profile)
            .values(**values)
            .on_conflict_do_update(
                index_elements=[Profile.id],
                set_={
                    "username": values["username"],
                    "first_name": values["first_name"],
                    "last_name": values["last_name"],
                    "email": values["email"],
                    "role": values["role"],
                    "is_active": True,
                },
            )
            .returning(Profile)
        )
        result = await session.execute(stmt)
        await session.commit()
        profile = result.scalars().one()
        await session.refresh(profile)
        return profile
