# app/models/schemas.py
from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

# ==========================================
# ENUM-URI
# ==========================================
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
    solutionat = "solutionat" # adăugat recent în issue

class PostType(str, Enum):
    NOUTATE = "NOUTATE"
    EVENIMENT = "EVENIMENT"


# ==========================================
# PROFILES
# ==========================================
class ProfileBase(BaseModel):
    username: str
    first_name: str
    last_name: str
    email: str
    role: UserRole = UserRole.STUDENT
    is_active: bool = True

class ProfileCreate(ProfileBase):
    # ID-ul este opțional pentru că la SSO/Supabase Auth se generează automat
    id: Optional[UUID] = None

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class ProfileResponse(ProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# FACULTIES & LOCATIONS
# ==========================================
class FacultyBase(BaseModel):
    name: str
    abbreviation: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website_url: Optional[str] = None
    dormitory_url: Optional[str] = None

class FacultyResponse(FacultyBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LocationBase(BaseModel):
    name: str
    faculty_id: Optional[int] = None

class LocationResponse(LocationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# COMPLAINTS (SESIZĂRI)
# ==========================================
class ComplaintBase(BaseModel):
    title: str
    description: str
    location_id: Optional[int] = None
    image_url: Optional[str] = None

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ComplaintStatus] = None

class ComplaintResponse(ComplaintBase):
    id: int
    user_id: UUID
    status: ComplaintStatus
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# ANNOUNCEMENTS (ANUNȚURI)
# ==========================================
class AnnouncementBase(BaseModel):
    type: PostType
    title: str
    content: str
    image_url: Optional[str] = None
    faculty_id: Optional[int] = None
    location_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[PostType] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AnnouncementResponse(AnnouncementBase):
    id: int
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)