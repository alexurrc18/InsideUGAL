from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles
from app.api.model_translation_cache import FACULTY_TRANSLATION, pretranslate_model_cache, translate_with_model_cache
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import schemas
from app.repositories.faculty_repo import FacultyRepository

router = APIRouter(prefix="/faculties", tags=["Faculties"])
repo = FacultyRepository()
manage_faculties = require_roles(schemas.UserRole.HEAD_ADMIN, schemas.UserRole.HEAD_FACULTATI)


@router.get("/", response_model=schemas.PaginatedResponse[schemas.FacultyResponse])
async def read_faculties(
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    items = await translate_with_model_cache(items, lang, session, FACULTY_TRANSLATION)
    return paginated_response(items, total, pagination)


@router.get("/{faculty_id}", response_model=schemas.FacultyResponse)
async def read_faculty(
    faculty_id: int,
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    session: AsyncSession = Depends(get_db),
):
    faculty = await repo.get_by_id(session, faculty_id)
    if not faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty not found.")
    return await translate_with_model_cache(faculty, lang, session, FACULTY_TRANSLATION)


@router.post("/", response_model=schemas.FacultyResponse, status_code=status.HTTP_201_CREATED)
async def create_faculty(
    faculty_in: schemas.FacultyCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_faculties),
):
    faculty = await repo.create(session, faculty_in)
    background_tasks.add_task(pretranslate_model_cache, faculty.id, FACULTY_TRANSLATION)
    return faculty


@router.patch("/{faculty_id}", response_model=schemas.FacultyResponse)
async def update_faculty(
    faculty_id: int,
    faculty_in: schemas.FacultyUpdate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_faculties),
):
    faculty = await repo.get_by_id(session, faculty_id)
    if not faculty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty not found.")
    updated_faculty = await repo.update(session, faculty, faculty_in)
    background_tasks.add_task(
        pretranslate_model_cache,
        updated_faculty.id,
        FACULTY_TRANSLATION,
        refresh_existing=True,
    )
    return updated_faculty


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
