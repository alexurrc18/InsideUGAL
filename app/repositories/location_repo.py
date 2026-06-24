from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Location
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
    if "coordinates" in data:
        data["coordinates"] = _coordinates_to_ewkt(data["coordinates"])
    return data


class LocationRepository(CRUDRepository[Location]):
    model = Location

    @staticmethod
    def _row_to_response(row: Any) -> dict[str, Any]:
        latitude = row.latitude
        longitude = row.longitude

        return {
            "id": row.id,
            "name": row.name,
            "faculty_id": row.faculty_id,
            "facility_id": row.facility_id,
            "marker": row.marker,
            "coordinates": (
                {"latitude": latitude, "longitude": longitude}
                if latitude is not None and longitude is not None
                else None
            ),
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

    @staticmethod
    def _response_select():
        return select(
            Location.id,
            Location.name,
            Location.faculty_id,
            Location.facility_id,
            Location.marker,
            Location.created_at,
            Location.updated_at,
            func.ST_Y(Location.coordinates).label("latitude"),
            func.ST_X(Location.coordinates).label("longitude"),
        )

    async def get_all_for_response(self, session: AsyncSession) -> list[dict[str, Any]]:
        result = await session.execute(self._response_select())
        return [self._row_to_response(row) for row in result.all()]

    async def get_page_for_response(
        self,
        session: AsyncSession,
        *,
        limit: int,
        offset: int,
    ) -> tuple[list[dict[str, Any]], int]:
        query = self._response_select().order_by(Location.name.asc())
        total_result = await session.execute(select(func.count()).select_from(Location))
        total = total_result.scalar_one()

        result = await session.execute(query.limit(limit).offset(offset))
        return [self._row_to_response(row) for row in result.all()], total

    async def get_response_by_id(self, session: AsyncSession, location_id: int) -> dict[str, Any] | None:
        result = await session.execute(self._response_select().where(Location.id == location_id))
        row = result.first()
        return self._row_to_response(row) if row else None

    async def create(self, session: AsyncSession, location_in: LocationCreate) -> Location:
        db_location = Location(**_serialize_location_data(location_in, exclude_unset=False))
        session.add(db_location)
        await session.commit()
        await session.refresh(db_location)
        return db_location

    async def update(self, session: AsyncSession, db_location: Location, location_in: LocationUpdate) -> Location:
        data = _serialize_location_data(location_in, exclude_unset=True)
        for key, value in data.items():
            setattr(db_location, key, value)

        await session.commit()
        await session.refresh(db_location)
        return db_location
