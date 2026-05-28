from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_user
from app.db.database import get_db
from app.models import schemas
from app.repositories.faculty_repo import FacultyRepository

# Instanțiem router-ul și repository-ul
router = APIRouter(prefix="/faculties", tags=["Faculties"])
repo = FacultyRepository()


@router.get("/", response_model=List[schemas.FacultyResponse])
async def read_faculties(session: AsyncSession = Depends(get_db)):
    """Returnează lista cu toate facultățile."""
    return await repo.get_all(session)


@router.get("/{faculty_id}", response_model=schemas.FacultyResponse)
async def read_faculty(faculty_id: int, session: AsyncSession = Depends(get_db)):
    """Returnează o facultate după ID-ul ei."""
    faculty = await repo.get_by_id(session, faculty_id)
    if not faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty not found.")
    return faculty


@router.post("/", response_model=schemas.FacultyResponse, status_code=status.HTTP_201_CREATED)
async def create_faculty(
    faculty_in: schemas.FacultyCreate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Adaugă o facultate nouă în baza de date."""
    return await repo.create(session, faculty_in)


@router.put("/{faculty_id}", response_model=schemas.FacultyResponse)
async def update_faculty(
    faculty_id: int,
    faculty_in: schemas.FacultyUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Actualizează datele unei facultăți existente."""
    faculty = await repo.get_by_id(session, faculty_id)
    if not faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty not found.")
    
    return await repo.update(session, faculty, faculty_in)


@router.delete("/{faculty_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faculty(
    faculty_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Șterge o facultate din baza de date."""
    faculty = await repo.get_by_id(session, faculty_id)
    if not faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty not found.")
    
    await repo.delete(session, faculty)
