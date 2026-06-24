from typing import Any

from app.models.models import Profile
from app.repositories.base import CRUDRepository
from app.models import schemas
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload


class ProfileRepository(CRUDRepository[Profile]):
    model = Profile

    async def get_page(self, session: AsyncSession, *, limit: int, offset: int) -> tuple[list[Profile], int]:
        query = select(Profile).options(joinedload(Profile.faculty))
        return await self.paginate(session, query, limit=limit, offset=offset)

    async def get_by_id(self, session: AsyncSession, entity_id: Any) -> Profile | None:
        result = await session.execute(
            select(Profile)
            .options(joinedload(Profile.faculty))
            .where(Profile.id == entity_id)
        )
        return result.scalars().first()

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
        loaded_profile = await self.get_by_id(session, profile.id)
        return loaded_profile or profile

    async def update(
        self,
        session: AsyncSession,
        db_entity: Profile,
        entity_in: BaseModel,
        **extra_data: Any,
    ) -> Profile:
        profile = await super().update(session, db_entity, entity_in, **extra_data)
        loaded_profile = await self.get_by_id(session, profile.id)
        return loaded_profile or profile
