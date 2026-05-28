from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_user
from app.db.database import get_db
from app.models import schemas
from app.repositories.profile_repo import ProfileRepository

# Instanțiem router-ul și repository-ul
router = APIRouter(prefix="/profiles", tags=["Profiles"])
repo = ProfileRepository()


@router.get("/", response_model=List[schemas.ProfileResponse])
async def read_profiles(session: AsyncSession = Depends(get_db)):
    """Returnează lista cu toate profilele."""
    return await repo.get_all(session)


@router.get("/{profile_id}", response_model=schemas.ProfileResponse)
async def read_profile(profile_id: UUID, session: AsyncSession = Depends(get_db)):
    """Returnează un profil după ID-ul lui (UUID)."""
    profile = await repo.get_by_id(session, profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return profile


@router.post("/", response_model=schemas.ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_in: schemas.ProfileCreate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Adaugă un profil nou în baza de date (Necesită Autentificare)."""
    return await repo.create(session, profile_in)


@router.put("/{profile_id}", response_model=schemas.ProfileResponse)
async def update_profile(
    profile_id: UUID,
    profile_in: schemas.ProfileUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Actualizează datele unui profil existent (Necesită Autentificare)."""
    profile = await repo.get_by_id(session, profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    
    return await repo.update(session, profile, profile_in)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Șterge un profil din baza de date (Necesită Autentificare)."""
    profile = await repo.get_by_id(session, profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    
    await repo.delete(session, profile)