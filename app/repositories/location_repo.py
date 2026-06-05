from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Location
from app.models.schemas import Coordinates, LocationCreate, LocationUpdate
from app.repositories.base import CRUDRepository, schema_to_data


def _coordinates_to_ewkt(coordinates: Coordinates | dict[str, float] | None) -> str | None:
    if coordinates is None:
        return None

    if isinstance(coordinates, dict):
        lat = coordinates["lat"]
        lon = coordinates["lon"]
    else:
        lat = coordinates.lat
        lon = coordinates.lon

    return f"SRID=4326;POINT({lon} {lat})"


def _serialize_location_data(location_in: LocationCreate | LocationUpdate, *, exclude_unset: bool) -> dict[str, Any]:
    data = schema_to_data(location_in, exclude_unset=exclude_unset)
    if "coordinates" in data:
        data["coordinates"] = _coordinates_to_ewkt(data["coordinates"])
    return data


class LocationRepository(CRUDRepository[Location]):
    model = Location

    async def create(
        self,
        session: AsyncSession,
        entity_in: LocationCreate,
        **extra_data: Any,
    ) -> Location:
        data = _serialize_location_data(entity_in, exclude_unset=False)
        data.update(extra_data)
        db_location = Location(**data)

        session.add(db_location)
        await session.commit()
        await session.refresh(db_location)
        return db_location

    async def update(
        self,
        session: AsyncSession,
        db_entity: Location,
        entity_in: LocationUpdate,
        **extra_data: Any,
    ) -> Location:
        data = _serialize_location_data(entity_in, exclude_unset=True)
        data.update(extra_data)
        for key, value in data.items():
            setattr(db_entity, key, value)

        await session.commit()
        await session.refresh(db_entity)
        return db_entity

