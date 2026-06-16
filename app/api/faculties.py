from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import schemas
from app.repositories.faculty_repo import FacultyRepository

router = APIRouter(prefix="/faculties", tags=["Faculties"])
repo = FacultyRepository()
manage_faculties = require_roles(schemas.UserRole.HEAD_ADMIN, schemas.UserRole.HEAD_FACULTATI)


@router.get("/", response_model=schemas.PaginatedResponse[schemas.FacultyResponse])
async def read_faculties(
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    return paginated_response(items, total, pagination)


@router.get("/{faculty_id}", response_model=schemas.FacultyResponse)
async def read_faculty(faculty_id: int, session: AsyncSession = Depends(get_db)):
    faculty = await repo.get_by_id(session, faculty_id)
    if not faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty not found.")
    return faculty


@router.post("/", response_model=schemas.FacultyResponse, status_code=status.HTTP_201_CREATED)
async def create_faculty(
    faculty_in: schemas.FacultyCreate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_faculties),
):
    return await repo.create(session, faculty_in)


@router.patch("/{faculty_id}", response_model=schemas.FacultyResponse)
async def update_faculty(
    faculty_id: int,
    faculty_in: schemas.FacultyUpdate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_faculties),
):
    faculty = await repo.get_by_id(session, faculty_id)
    if not faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty not found.")
    return await repo.update(session, faculty, faculty_in)


@router.delete("/{faculty_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faculty(
    faculty_id: int,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_faculties),
):
    faculty = await repo.get_by_id(session, faculty_id)
    if not faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty not found.")
    await repo.delete(session, faculty)
