from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_profile, require_admin
from app.db.database import get_db
from app.models import schemas
from app.repositories.profile_repo import ProfileRepository

router = APIRouter(prefix="/profiles", tags=["Profiles"])
repo = ProfileRepository()


@router.get("/", response_model=list[schemas.ProfileResponse])
async def read_profiles(session: AsyncSession = Depends(get_db), current_user: str = Depends(require_admin)):
    return await repo.get_all(session)


@router.get("/me", response_model=schemas.ProfileResponse)
async def read_my_profile(profile=Depends(get_current_profile)):
    return profile


@router.get("/{profile_id}", response_model=schemas.ProfileResponse)
async def read_profile(profile_id: UUID, session: AsyncSession = Depends(get_db), current_user: str = Depends(require_admin)):
    profile = await repo.get_by_id(session, str(profile_id))
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return profile


@router.post("/", response_model=schemas.ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_in: schemas.ProfileCreate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    return await repo.create(session, profile_in)


@router.patch("/{profile_id}", response_model=schemas.ProfileResponse)
async def update_profile(
    profile_id: UUID,
    profile_in: schemas.ProfileUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    profile = await repo.get_by_id(session, str(profile_id))
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return await repo.update(session, profile, profile_in)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    profile = await repo.get_by_id(session, str(profile_id))
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    await repo.delete(session, profile)
