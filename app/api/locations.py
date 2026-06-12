from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles
from app.api.crud import ensure_exists
from app.db.database import get_db
from app.models import models, schemas
from app.repositories.location_repo import LocationRepository

router = APIRouter(prefix="/locations", tags=["Locations"])
repo = LocationRepository()
manage_locations = require_roles(schemas.UserRole.HEAD_ADMIN, schemas.UserRole.HEAD_FACULTATI)


async def validate_faculty(payload: BaseModel, db: AsyncSession) -> None:
    faculty_id = getattr(payload, "faculty_id", None)
    if faculty_id:
        await ensure_exists(db, models.Faculty, faculty_id, "Faculty not found.")


@router.get("/", response_model=list[schemas.LocationResponse])
async def read_locations(session: AsyncSession = Depends(get_db)):
    return await repo.get_all_for_response(session)


@router.get("/{location_id}", response_model=schemas.LocationResponse)
async def read_location(location_id: int, session: AsyncSession = Depends(get_db)):
    location = await repo.get_response_by_id(session, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found.")
    return location


@router.post("/", response_model=schemas.LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    location_in: schemas.LocationCreate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_locations),
):
    await validate_faculty(location_in, session)
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
    await validate_faculty(location_in, session)
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
