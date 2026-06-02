from datetime import datetime
from decimal import Decimal
from enum import Enum
import re
import struct
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator, model_validator


class UserRole(str, Enum):
    STUDENT = "STUDENT"
    STUDENT_RESPONSABIL = "STUDENT_RESPONSABIL"
    PROFESOR = "PROFESOR"
    HEAD_CANTINA = "HEAD_CANTINA"
    HEAD_FACULTATI = "HEAD_FACULTATI"
    HEAD_ADMIN = "HEAD_ADMIN"


class ComplaintStatus(str, Enum):
    in_asteptare = "in_asteptare"
    in_lucru = "in_lucru"
    finalizat = "finalizat"
    respins = "respins"


class PostType(str, Enum):
    NOUTATE = "NOUTATE"
    EVENIMENT = "EVENIMENT"


class ProfileBase(BaseModel):
    username: str | None = None
    first_name: str
    last_name: str
    email: str
    role: UserRole = UserRole.STUDENT
    is_active: bool = True


class ProfileCreate(ProfileBase):
    id: UUID


class ProfileUpdate(BaseModel):
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class FacultyBase(BaseModel):
    name: str
    address: str | None = None
    phone: str | None = None
    website_url: str | None = None


class FacultyCreate(FacultyBase):
    pass


class FacultyUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    website_url: str | None = None


class FacultyResponse(FacultyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = None


class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class Coordinates(BaseModel):
    lat: float
    lon: float


def _parse_point_coordinates(coordinates: object) -> Coordinates | None:
    raw_data = getattr(coordinates, "data", None)
    if raw_data is not None:
        data = bytes.fromhex(raw_data) if isinstance(raw_data, str) else bytes(raw_data)
        if len(data) < 21:
            return None

        byte_order = "<" if data[0] == 1 else ">"
        geometry_type = struct.unpack(f"{byte_order}I", data[1:5])[0]
        base_geometry_type = geometry_type & 0x000000FF
        if base_geometry_type != 1:
            return None

        has_srid = bool(geometry_type & 0x20000000)
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
    coordinates: Coordinates | None = None
    faculty_id: int | None = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = None
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
        if coordinates is None or isinstance(coordinates, Coordinates):
            return coordinates
        if isinstance(coordinates, dict):
            return Coordinates.model_validate(coordinates)
        return _parse_point_coordinates(coordinates)

    @field_serializer("coordinates")
    def serialize_coordinates(self, coordinates: Coordinates | None) -> dict[str, float] | None:
        return None if coordinates is None else coordinates.model_dump()


class ProductBase(BaseModel):
    name: str
    description: str | None = None
    quantity: str
    price: Decimal = Field(gt=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    quantity: str | None = None
    price: Decimal | None = Field(default=None, gt=0)


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class DailyMenuBase(BaseModel):
    day_of_week: int = Field(ge=1, le=7)
    product_ids: list[int] = Field(default_factory=list)


class DailyMenuCreate(DailyMenuBase):
    pass


class DailyMenuUpdate(BaseModel):
    day_of_week: int | None = Field(default=None, ge=1, le=7)
    product_ids: list[int] | None = None


class DailyMenuResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_of_week: int
    products: list[ProductResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ComplaintBase(BaseModel):
    location_id: int | None = None
    title: str
    description: str
    image_url: str | None = None
    status: ComplaintStatus = ComplaintStatus.in_asteptare


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintUpdate(BaseModel):
    location_id: int | None = None
    title: str | None = None
    description: str | None = None
    image_url: str | None = None
    status: ComplaintStatus | None = None


class ComplaintResponse(ComplaintBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class AnnouncementBase(BaseModel):
    type: PostType = PostType.NOUTATE
    title: str | None = None
    content: str
    image_url: str | None = None
    faculty_id: int | None = None
    location_name: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None

    @model_validator(mode="after")
    def validate_post_type_fields(self):
        if self.type == PostType.EVENIMENT:
            if self.start_date is None:
                raise ValueError("start_date is required for EVENIMENT announcements.")
            if self.end_date is not None and self.end_date < self.start_date:
                raise ValueError("end_date must be after start_date.")
        else:
            self.start_date = None
            self.end_date = None
            self.location_name = None
        return self


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    type: PostType | None = None
    title: str | None = None
    content: str | None = None
    image_url: str | None = None
    faculty_id: int | None = None
    location_name: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class AnnouncementResponse(AnnouncementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: UUID
    created_at: datetime
    updated_at: datetime