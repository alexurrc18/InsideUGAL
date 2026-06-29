from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from geoalchemy2.shape import to_shape

from app.models.models import Faculty, Location
from app.models.schemas import Coordinates, LocationCreate, LocationUpdate
from app.repositories.base import CRUDRepository, schema_to_data


def _coordinates_to_ewkt(coordinates: Coordinates | dict[str, float] | None) -> str | None:
    if coordinates is None:
        return None

    if isinstance(coordinates, dict):
        lat = coordinates["latitude"]
        lon = coordinates["longitude"]
    else:
        lat = coordinates.latitude
        lon = coordinates.longitude

    return f"SRID=4326;POINT({lon} {lat})"


def _serialize_location_data(location_in: LocationCreate | LocationUpdate, *, exclude_unset: bool) -> dict[str, Any]:
    data = schema_to_data(location_in, exclude_unset=exclude_unset)
    data.pop("faculty_ids", None)
    if "coordinates" in data:
        data["coordinates"] = _coordinates_to_ewkt(data["coordinates"])
    return data


class LocationRepository(CRUDRepository[Location]):
    model = Location

    @staticmethod
    def _location_to_response(location: Location) -> dict[str, Any]:
        coordinates = None
        if location.coordinates is not None:
            point = to_shape(location.coordinates)
            coordinates = {"latitude": point.y, "longitude": point.x}

        return {
            "id": location.id,
            "name": location.name,
            "faculty_ids": [faculty.id for faculty in location.faculties],
            "faculties": list(location.faculties),
            "facility_id": location.facility_id,
            "image_url": location.facility.image_url if location.facility else None,
            "marker": location.marker,
            "coordinates": coordinates,
            "created_at": location.created_at,
            "updated_at": location.updated_at,
        }

    @staticmethod
    def _response_select():
        return (
            select(Location)
            .options(selectinload(Location.faculties), selectinload(Location.facility))
            .order_by(Location.name.asc())
        )

    async def _load_faculties(self, session: AsyncSession, faculty_ids: list[int]) -> list[Faculty]:
        if not faculty_ids:
            return []

        result = await session.execute(select(Faculty).where(Faculty.id.in_(faculty_ids)))
        faculties = list(result.scalars().all())
        found_ids = {faculty.id for faculty in faculties}
        missing_ids = set(faculty_ids) - found_ids
        if missing_ids:
            raise ValueError(f"Faculty not found: {min(missing_ids)}")
        return faculties

    async def get_all_for_response(self, session: AsyncSession) -> list[dict[str, Any]]:
        result = await session.execute(self._response_select())
        return [self._location_to_response(location) for location in result.scalars().all()]

    async def get_page_for_response(
        self,
        session: AsyncSession,
        *,
        limit: int,
        offset: int,
    ) -> tuple[list[dict[str, Any]], int]:
        query = self._response_select()
        total_result = await session.execute(select(func.count()).select_from(Location))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        return [self._location_to_response(location) for location in result.scalars().all()], total

    async def get_response_by_id(self, session: AsyncSession, location_id: int) -> dict[str, Any] | None:
        result = await session.execute(self._response_select().where(Location.id == location_id))
        location = result.scalars().first()
        return self._location_to_response(location) if location else None

    async def create(self, session: AsyncSession, location_in: LocationCreate) -> Location:
        db_location = Location(**_serialize_location_data(location_in, exclude_unset=False))
        db_location.faculties = await self._load_faculties(session, location_in.faculty_ids)
        session.add(db_location)
        await session.commit()
        await session.refresh(db_location)
        return db_location

    async def update(self, session: AsyncSession, db_location: Location, location_in: LocationUpdate) -> Location:
        data = _serialize_location_data(location_in, exclude_unset=True)
        update_data = schema_to_data(location_in, exclude_unset=True)
        for key, value in data.items():
            setattr(db_location, key, value)
        if "faculty_ids" in update_data:
            db_location.faculties = await self._load_faculties(session, update_data["faculty_ids"] or [])

        await session.commit()
        await session.refresh(db_location)
        return db_location
