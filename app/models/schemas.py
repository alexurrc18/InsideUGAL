# app/models/schemas.py
from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
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
    solutionat = "solutionat"

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

class FacultyCreate(FacultyBase):
    pass

class FacultyUpdate(BaseModel):
    name: Optional[str] = None
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

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    faculty_id: Optional[int] = None

class LocationResponse(LocationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# CATEGORIES (CATEGORII)
# ==========================================
class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: int
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


# ==========================================
# PRODUCTS (PRODUSE CANTINĂ)
# ==========================================
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: str
    price: Decimal

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[str] = None
    price: Optional[Decimal] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# DAILY MENUS (MENIUL ZILEI)
# ==========================================
class DailyMenuBase(BaseModel):
    day_of_week: int

class DailyMenuCreate(DailyMenuBase):
    product_ids: List[int] = [] 

class DailyMenuUpdate(BaseModel):
    day_of_week: Optional[int] = None
    product_ids: Optional[List[int]] = None

class DailyMenuResponse(DailyMenuBase):
    id: int
    products: List[ProductResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)