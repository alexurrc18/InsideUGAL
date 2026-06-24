from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.faculties import manage_faculties
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import schemas
from app.repositories.facility_repo import FacilityRepository
from app.repositories.facility_schedule_repo import FacilityScheduleRepository

router = APIRouter(prefix="/facilities", tags=["Facilities"])
repo = FacilityRepository()
schedule_repo = FacilityScheduleRepository()


@router.get("/", response_model=schemas.PaginatedResponse[schemas.FacilityResponse])
async def read_facilities(
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    items, total = await repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    return paginated_response(items, total, pagination)


@router.get("/{facility_id}", response_model=schemas.FacilityResponse)
async def read_facility(facility_id: int, session: AsyncSession = Depends(get_db)):
    facility = await repo.get_by_id(session, facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found.")
    return facility


@router.post("/", response_model=schemas.FacilityResponse, status_code=status.HTTP_201_CREATED)
async def create_facility(
    facility_in: schemas.FacilityCreate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_faculties),
):
    facility = await repo.create(session, facility_in)
    return await repo.get_by_id(session, facility.id)


@router.patch("/{facility_id}", response_model=schemas.FacilityResponse)
async def update_facility(
    facility_id: int,
    facility_in: schemas.FacilityUpdate,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_faculties),
):
    facility = await repo.get_by_id(session, facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found.")
    updated_facility = await repo.update(session, facility, facility_in)
    return await repo.get_by_id(session, updated_facility.id)


@router.delete("/{facility_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_facility(
    facility_id: int,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_faculties),
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
    current_profile=Depends(manage_faculties),
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
    current_profile=Depends(manage_faculties),
):
    schedule = await schedule_repo.get_by_id(session, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility schedule not found.")
    return await schedule_repo.update(session, schedule, schedule_in)


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_facility_schedule(
    schedule_id: int,
    session: AsyncSession = Depends(get_db),
    current_profile=Depends(manage_faculties),
):
    schedule = await schedule_repo.get_by_id(session, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility schedule not found.")
    await schedule_repo.delete(session, schedule)
