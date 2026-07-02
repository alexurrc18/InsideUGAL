from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles
from app.api.model_translation_cache import (
    FACILITY_TRANSLATION,
    LOCATION_TRANSLATION,
    pretranslate_model_cache,
    translate_with_model_cache,
)
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import schemas
from app.repositories.facility_repo import FacilityRepository
from app.repositories.facility_schedule_repo import FacilityScheduleRepository

router = APIRouter(prefix="/facilities", tags=["Facilities"])
repo = FacilityRepository()
schedule_repo = FacilityScheduleRepository()
manage_facilities = require_roles(
    schemas.UserRole.HEAD_ADMIN,
    schemas.UserRole.HEAD_FACULTATI,
    schemas.UserRole.HEAD_CANTINA,
)


async def translate_facility_response(payload, lang: str, session: AsyncSession):
    payload = await translate_with_model_cache(payload, lang, session, FACILITY_TRANSLATION)
    items = payload if isinstance(payload, list) else [payload]
    locations = [
        location
        for item in items
        if isinstance(item, dict)
        for location in item.get("locations", [])
        if isinstance(location, dict)
    ]
    if locations:
        await translate_with_model_cache(locations, lang, session, LOCATION_TRANSLATION)
    return payload


@router.get("/", response_model=schemas.PaginatedResponse[schemas.FacilityResponse])
async def read_facilities(
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    response_items = [
        schemas.FacilityResponse.model_validate(item).model_dump(mode="json")
        for item in items
    ]
    response_items = await translate_facility_response(response_items, lang, session)
    return paginated_response(response_items, total, pagination)


@router.get("/{facility_id}", response_model=schemas.FacilityResponse)
async def read_facility(
    facility_id: int,
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    session: AsyncSession = Depends(get_db),
):
    facility = await repo.get_by_id(session, facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found.")
    response_facility = schemas.FacilityResponse.model_validate(facility).model_dump(mode="json")
    return await translate_facility_response(response_facility, lang, session)


@router.post("/", response_model=schemas.FacilityResponse, status_code=status.HTTP_201_CREATED)
async def create_facility(
    facility_in: schemas.FacilityCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_facilities),
):
    facility = await repo.create(session, facility_in)
    background_tasks.add_task(pretranslate_model_cache, facility.id, FACILITY_TRANSLATION)
    return await repo.get_by_id(session, facility.id)


@router.patch("/{facility_id}", response_model=schemas.FacilityResponse)
async def update_facility(
    facility_id: int,
    facility_in: schemas.FacilityUpdate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_facilities),
):
    facility = await repo.get_by_id(session, facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found.")
    updated_facility = await repo.update(session, facility, facility_in)
    background_tasks.add_task(
        pretranslate_model_cache,
        updated_facility.id,
        FACILITY_TRANSLATION,
        refresh_existing=True,
    )
    return await repo.get_by_id(session, updated_facility.id)


@router.delete("/{facility_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_facility(
    facility_id: int,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_facilities),
):
    facility = await repo.get_by_id(session, facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found.")
    await repo.delete(session, facility)


@router.post(
    "/{facility_id}/schedules",
    response_model=schemas.FacilityScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_facility_schedule(
    facility_id: int,
    schedule_in: schemas.FacilityScheduleCreate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_facilities),
):
    facility = await repo.get_by_id(session, facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found.")
    return await schedule_repo.create(session, schedule_in, facility_id=facility_id)


@router.patch("/schedules/{schedule_id}", response_model=schemas.FacilityScheduleResponse)
async def update_facility_schedule(
    schedule_id: int,
    schedule_in: schemas.FacilityScheduleUpdate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_facilities),
):
    schedule = await schedule_repo.get_by_id(session, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility schedule not found.")
    return await schedule_repo.update(session, schedule, schedule_in)


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_facility_schedule(
    schedule_id: int,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_facilities),
):
    schedule = await schedule_repo.get_by_id(session, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility schedule not found.")
    await schedule_repo.delete(session, schedule)
