from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_user
from app.db.database import get_db
from app.models import models, schemas
from app.api.crud import ensure_exists
from app.repositories.complaint_repo import ComplaintRepository

# Instanțiem router-ul și repository-ul
router = APIRouter(prefix="/complaints", tags=["Complaints"])
repo = ComplaintRepository()


async def validate_complaint_refs(payload: BaseModel, db: AsyncSession) -> None:
    """Verifică dacă utilizatorul și locația există în baza de date."""
    user_id = getattr(payload, "user_id", None)
    location_id = getattr(payload, "location_id", None)

    if user_id:
        await ensure_exists(db, models.Profile, user_id, "Profile not found.")
    if location_id:
        await ensure_exists(db, models.Location, location_id, "Location not found.")


@router.get("/", response_model=List[schemas.ComplaintResponse])
async def read_complaints(session: AsyncSession = Depends(get_db)):
    """Returnează lista cu toate sesizările."""
    return await repo.get_all(session)


@router.get("/{complaint_id}", response_model=schemas.ComplaintResponse)
async def read_complaint(complaint_id: int, session: AsyncSession = Depends(get_db)):
    """Returnează o sesizare după ID-ul ei."""
    complaint = await repo.get_by_id(session, complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    return complaint


@router.post("/", response_model=schemas.ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    complaint_in: schemas.ComplaintCreate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Adaugă o sesizare nouă în baza de date (Necesită Autentificare)."""
    # Validăm ID-urile înainte de inserare
    await validate_complaint_refs(complaint_in, session)
    return await repo.create(session, complaint_in)


@router.put("/{complaint_id}", response_model=schemas.ComplaintResponse)
async def update_complaint(
    complaint_id: int,
    complaint_in: schemas.ComplaintUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Actualizează datele unei sesizări existente (Necesită Autentificare)."""
    complaint = await repo.get_by_id(session, complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    
    # Validăm ID-urile înainte de actualizare
    await validate_complaint_refs(complaint_in, session)
    return await repo.update(session, complaint, complaint_in)


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_complaint(
    complaint_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Șterge o sesizare din baza de date (Necesită Autentificare)."""
    complaint = await repo.get_by_id(session, complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    
    await repo.delete(session, complaint)