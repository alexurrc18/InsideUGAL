from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_user
from app.db.database import get_db
from app.models import models, schemas
from app.api.crud import ensure_exists
from app.repositories.location_repo import LocationRepository

# Instanțiem router-ul și repository-ul
router = APIRouter(prefix="/locations", tags=["Locations"])
repo = LocationRepository()


async def validate_faculty(payload: BaseModel, db: AsyncSession) -> None:
    """Verifică dacă facultatea asociată există în baza de date."""
    faculty_id = getattr(payload, "faculty_id", None)
    if faculty_id:
        await ensure_exists(db, models.Faculty, faculty_id, "Faculty not found.")


@router.get("/", response_model=List[schemas.LocationResponse])
async def read_locations(session: AsyncSession = Depends(get_db)):
    """Returnează lista cu toate locațiile."""
    return await repo.get_all(session)


@router.get("/{location_id}", response_model=schemas.LocationResponse)
async def read_location(location_id: int, session: AsyncSession = Depends(get_db)):
    """Returnează o locație după ID-ul ei."""
    location = await repo.get_by_id(session, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found.")
    return location


@router.post("/", response_model=schemas.LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    location_in: schemas.LocationCreate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Adaugă o locație nouă în baza de date (Necesită Autentificare)."""
    # Validăm ID-ul facultății înainte de inserare
    await validate_faculty(location_in, session)
    return await repo.create(session, location_in)


@router.put("/{location_id}", response_model=schemas.LocationResponse)
async def update_location(
    location_id: int,
    location_in: schemas.LocationUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Actualizează datele unei locații existente (Necesită Autentificare)."""
    location = await repo.get_by_id(session, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found.")
    
    # Validăm ID-ul facultății înainte de actualizare
    await validate_faculty(location_in, session)
    return await repo.update(session, location, location_in)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Șterge o locație din baza de date (Necesită Autentificare)."""
    location = await repo.get_by_id(session, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found.")
    
    await repo.delete(session, location)