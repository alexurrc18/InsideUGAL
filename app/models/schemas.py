from datetime import datetime
from decimal import Decimal
import re
import struct
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer, field_validator

from app.models.models import ComplaintStatus, UserRole


class ProfileBase(BaseModel):
    email: str
    full_name: str
    role: UserRole = UserRole.STUDENT
    is_active: bool | None = True


class ProfileCreate(ProfileBase):
    id: UUID


class ProfileUpdate(BaseModel):
    email: str | None = None
    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class FacultyBase(BaseModel):
    name: str
    abbreviation: str
    website_url: str | None = None
    dormitory_url: str | None = None
    description: str | None = None


class FacultyCreate(FacultyBase):
    pass


class FacultyUpdate(BaseModel):
    name: str | None = None
    abbreviation: str | None = None
    website_url: str | None = None
    dormitory_url: str | None = None
    description: str | None = None


class FacultyResponse(FacultyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class Coordinates(BaseModel):
    lat: float
    lon: float


def _parse_point_coordinates(coordinates: object) -> Coordinates | None:
    raw_data = getattr(coordinates, "data", None)

    if raw_data is not None:
        if isinstance(raw_data, str):
            data = bytes.fromhex(raw_data)
        else:
            data = bytes(raw_data)

        if len(data) < 21:
            return None

        byte_order = "<" if data[0] == 1 else ">"
        geometry_type = struct.unpack(f"{byte_order}I", data[1:5])[0]
        has_srid = bool(geometry_type & 0x20000000)
        base_geometry_type = geometry_type & 0x000000FF

        if base_geometry_type != 1:
            return None

        offset = 9 if has_srid else 5
        lon, lat = struct.unpack(f"{byte_order}dd", data[offset : offset + 16])
        return Coordinates(lat=lat, lon=lon)

    match = re.fullmatch(
        r"POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)",
        str(coordinates),
        flags=re.IGNORECASE,
    )
    if match is None:
        return None

    lon, lat = match.groups()
    return Coordinates(lat=float(lat), lon=float(lon))


class LocationBase(BaseModel):
    name: str
    address: str | None = None
    coordinates: Coordinates | None = None
    faculty_id: int | None = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    coordinates: Coordinates | None = None
    faculty_id: int | None = None


class LocationResponse(LocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @field_validator("coordinates", mode="before")
    @classmethod
    def validate_coordinates(cls, coordinates: object) -> Coordinates | None:
        if coordinates is None:
            return None
        if isinstance(coordinates, Coordinates):
            return coordinates
        if isinstance(coordinates, dict):
            return Coordinates.model_validate(coordinates)

        return _parse_point_coordinates(coordinates)

    @field_serializer("coordinates")
    def serialize_coordinates(
        self,
        coordinates: Coordinates | None,
    ) -> dict[str, float] | None:
        if coordinates is None:
            return None
        return coordinates.model_dump()


class CafeteriaMenuBase(BaseModel):
    name: str
    price: Decimal
    description: str | None = None
    calories: int | None = None
    proteins: Decimal | None = None
    fats: Decimal | None = None
    carbohydrates: Decimal | None = None
    grams: int
    day_of_week: int | None = None
    is_available: bool | None = True


class CafeteriaMenuCreate(CafeteriaMenuBase):
    pass


class CafeteriaMenuUpdate(BaseModel):
    name: str | None = None
    price: Decimal | None = None
    description: str | None = None
    calories: int | None = None
    proteins: Decimal | None = None
    fats: Decimal | None = None
    carbohydrates: Decimal | None = None
    grams: int | None = None
    day_of_week: int | None = None
    is_available: bool | None = None


class CafeteriaMenuResponse(CafeteriaMenuBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class ComplaintBase(BaseModel):
    user_id: UUID
    location_id: int | None = None
    title: str
    description: str
    image_url: str | None = None
    status: ComplaintStatus = ComplaintStatus.NEW


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintUpdate(BaseModel):
    user_id: UUID | None = None
    location_id: int | None = None
    title: str | None = None
    description: str | None = None
    image_url: str | None = None
    status: ComplaintStatus | None = None


class ComplaintResponse(ComplaintBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class AnnouncementBase(BaseModel):
    title: str
    content: str
    category: str | None = None
    image_url: str | None = None
    is_event: bool | None = False
    start_date: datetime | None = None
    end_date: datetime | None = None
    location_name: str | None = None
    target_audience: str | None = None
    event_redirect_id: int | None = None
    send_push: bool | None = False
    created_by: UUID


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    image_url: str | None = None
    is_event: bool | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    location_name: str | None = None
    target_audience: str | None = None
    event_redirect_id: int | None = None
    send_push: bool | None = None
    created_by: UUID | None = None


class AnnouncementResponse(AnnouncementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
