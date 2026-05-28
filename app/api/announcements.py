from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_user
from app.db.database import get_db
from app.models import models, schemas
from app.api.crud import ensure_exists
from app.repositories.announcement_repo import AnnouncementRepository

# Instanțiem router-ul și repository-ul
router = APIRouter(prefix="/announcements", tags=["Announcements"])
repo = AnnouncementRepository()


async def validate_creator(payload: BaseModel, db: AsyncSession) -> None:
    created_by = getattr(payload, "created_by", None)
    if created_by:
        await ensure_exists(db, models.Profile, created_by, "Creator profile not found.")


@router.get("/", response_model=List[schemas.AnnouncementResponse])
async def read_announcements(session: AsyncSession = Depends(get_db)):
    """Returnează lista cu toate anunțurile."""
    return await repo.get_all(session)


@router.get("/{announcement_id}", response_model=schemas.AnnouncementResponse)
async def read_announcement(announcement_id: int, session: AsyncSession = Depends(get_db)):
    """Returnează un anunț după ID-ul lui."""
    announcement = await repo.get_by_id(session, announcement_id)
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")
    return announcement


@router.post("/", response_model=schemas.AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement_in: schemas.AnnouncementCreate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Adaugă un anunț nou în baza de date (Necesită Autentificare)."""
    await validate_creator(announcement_in, session)
    return await repo.create(session, announcement_in)


@router.put("/{announcement_id}", response_model=schemas.AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    announcement_in: schemas.AnnouncementUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Actualizează datele unui anunț existent (Necesită Autentificare)."""
    announcement = await repo.get_by_id(session, announcement_id)
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")
    
    await validate_creator(announcement_in, session)
    return await repo.update(session, announcement, announcement_in)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Șterge un anunț din baza de date (Necesită Autentificare)."""
    announcement = await repo.get_by_id(session, announcement_id)
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")
    
    await repo.delete(session, announcement)