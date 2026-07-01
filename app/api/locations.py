from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles
from app.api.crud import ensure_exists
from app.api.pagination import PaginationParams, paginated_response
from app.api.translation_utils import translate_payload
from app.db.database import get_db
from app.models import models, schemas
from app.repositories.location_repo import LocationRepository

router = APIRouter(prefix="/locations", tags=["Locations"])
repo = LocationRepository()
manage_locations = require_roles(schemas.UserRole.HEAD_ADMIN, schemas.UserRole.HEAD_FACULTATI)


async def validate_faculties(payload: BaseModel, db: AsyncSession) -> None:
    faculty_ids = getattr(payload, "faculty_ids", None) or []
    for faculty_id in faculty_ids:
        await ensure_exists(db, models.Faculty, faculty_id, "Faculty not found.")


async def validate_facility(payload: BaseModel, db: AsyncSession) -> None:
    facility_id = getattr(payload, "facility_id", None)
    if facility_id is not None:
        await ensure_exists(db, models.Facility, facility_id, "Facility not found.")


@router.get("/", response_model=schemas.PaginatedResponse[schemas.LocationResponse])
async def read_locations(
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await repo.get_page_for_response(session, limit=pagination.size, offset=pagination.offset)
    items = await translate_payload(items, lang)
    return paginated_response(items, total, pagination)


@router.get("/{location_id}", response_model=schemas.LocationResponse)
async def read_location(
    location_id: int,
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    session: AsyncSession = Depends(get_db),
):
    location = await repo.get_response_by_id(session, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found.")
    return await translate_payload(location, lang)


@router.post("/", response_model=schemas.LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    location_in: schemas.LocationCreate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_locations),
):
    await validate_faculties(location_in, session)
    await validate_facility(location_in, session)
    location = await repo.create(session, location_in)
    return await repo.get_response_by_id(session, location.id)


@router.patch("/{location_id}", response_model=schemas.LocationResponse)
async def update_location(
    location_id: int,
    location_in: schemas.LocationUpdate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_locations),
):
    location = await repo.get_by_id(session, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found.")
    await validate_faculties(location_in, session)
    await validate_facility(location_in, session)
    updated_location = await repo.update(session, location, location_in)
    return await repo.get_response_by_id(session, updated_location.id)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: int,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_locations),
):
    location = await repo.get_by_id(session, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found.")
    await repo.delete(session, location)
