from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer

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


class FacultyCreate(FacultyBase):
    pass


class FacultyUpdate(BaseModel):
    name: str | None = None
    abbreviation: str | None = None


class FacultyResponse(FacultyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class LocationBase(BaseModel):
    name: str
    address: str | None = None
    coordinates: Any | None = None
    faculty_id: int | None = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    coordinates: Any | None = None
    faculty_id: int | None = None


class LocationResponse(LocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @field_serializer("coordinates")
    def serialize_coordinates(self, coordinates: Any | None) -> str | None:
        if coordinates is None:
            return None
        return str(coordinates)


class DormRoomBase(BaseModel):
    building_name: str
    room_number: str
    capacity: int


class DormRoomCreate(DormRoomBase):
    pass


class DormRoomUpdate(BaseModel):
    building_name: str | None = None
    room_number: str | None = None
    capacity: int | None = None


class DormRoomResponse(DormRoomBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CafeteriaMenuBase(BaseModel):
    name: str
    price: Decimal
    calories: int | None = None
    proteins: Decimal | None = None
    is_available: bool | None = True


class CafeteriaMenuCreate(CafeteriaMenuBase):
    pass


class CafeteriaMenuUpdate(BaseModel):
    name: str | None = None
    price: Decimal | None = None
    calories: int | None = None
    proteins: Decimal | None = None
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
    status: ComplaintStatus = ComplaintStatus.NEW


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintUpdate(BaseModel):
    user_id: UUID | None = None
    location_id: int | None = None
    title: str | None = None
    description: str | None = None
    status: ComplaintStatus | None = None


class ComplaintResponse(ComplaintBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class PaymentBase(BaseModel):
    user_id: UUID
    amount: Decimal
    description: str
    status: str | None = "PENDING"


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    user_id: UUID | None = None
    amount: Decimal | None = None
    description: str | None = None
    status: str | None = None


class PaymentResponse(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class AnnouncementBase(BaseModel):
    title: str
    content: str
    event_date: datetime | None = None
    created_by: UUID


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    event_date: datetime | None = None
    created_by: UUID | None = None


class AnnouncementResponse(AnnouncementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
