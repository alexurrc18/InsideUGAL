from datetime import datetime
from decimal import Decimal
from enum import Enum
import re
import struct
from uuid import UUID
from typing import Optional

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
    model_config = ConfigDict(extra="ignore")

    username: Optional[str] = None
    first_name: str
    last_name: str
    email: str
    role: UserRole = UserRole.STUDENT
    is_active: bool = True


class ProfileCreate(ProfileBase):
    # MODIFICAT AICI: Am permis ca ID-ul să fie adăugat dinamic de cod
    id: Optional[UUID] = None


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class FacultyBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website_url: Optional[str] = None
    abbreviation: Optional[str] = None
    description: Optional[str] = None
    dormitory_url: Optional[str] = None


class FacultyCreate(FacultyBase):
    pass


class FacultyUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website_url: Optional[str] = None
    abbreviation: Optional[str] = None
    description: Optional[str] = None
    dormitory_url: Optional[str] = None


class FacultyResponse(FacultyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CategoryBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None


class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class Coordinates(BaseModel):
    model_config = ConfigDict(extra="ignore")

    lat: float
    lon: float


def _parse_point_coordinates(coordinates: object) -> Optional[Coordinates]:
    raw_data = getattr(coordinates, "data", None)
    if raw_data is not None:
        data = bytes.fromhex(raw_data) if isinstance(raw_data, str) else bytes(raw_data)
        if len(data) < 21:
            return None

        byte_order = "<" if data[0] == 1 else ">"
        geometry_type = struct.unpack(f"{byte_order}I", data[1:5])[0]
        geometry_type = int(geometry_type)
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
    model_config = ConfigDict(extra="ignore")

    name: str
    coordinates: Optional[Coordinates] = None
    faculty_id: Optional[int] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    faculty_id: Optional[int] = None


class LocationResponse(LocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @field_validator("coordinates", mode="before")
    @classmethod
    def validate_coordinates(cls, coordinates: object) -> Optional[Coordinates]:
        if coordinates is None or isinstance(coordinates, Coordinates):
            return coordinates
        if isinstance(coordinates, dict):
            return Coordinates.model_validate(coordinates)
        return _parse_point_coordinates(coordinates)

    @field_serializer("coordinates")
    def serialize_coordinates(self, coordinates: Optional[Coordinates]) -> Optional[dict[str, float]]:
        return None if coordinates is None else coordinates.model_dump()


class ProductBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    description: Optional[str] = None
    quantity: str
    price: Decimal = Field(gt=0)

    @field_validator("price", mode="before")
    @classmethod
    def parse_price(cls, v):
        return Decimal(str(v)) if not isinstance(v, Decimal) else v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[str] = None
    price: Optional[Decimal] = Field(default=None, gt=0)


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class DailyMenuBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    day_of_week: int = Field(ge=1, le=7)
    product_ids: list[int] = Field(default_factory=list)


class DailyMenuCreate(DailyMenuBase):
    pass


class DailyMenuUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    day_of_week: Optional[int] = Field(default=None, ge=1, le=7)
    product_ids: Optional[list[int]] = None


class DailyMenuResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_of_week: int
    products: list[ProductResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ComplaintBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    location_id: Optional[int] = None
    title: str
    description: str
    image_url: Optional[str] = None
    status: ComplaintStatus = ComplaintStatus.in_asteptare


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    location_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[ComplaintStatus] = None


class ComplaintResponse(ComplaintBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class AnnouncementBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: PostType = PostType.NOUTATE
    title: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    faculty_id: Optional[int] = None
    location_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

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
        return self


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: Optional[PostType] = None
    title: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    faculty_id: Optional[int] = None
    location_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AnnouncementResponse(AnnouncementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: UUID
    created_at: datetime
    updated_at: datetime