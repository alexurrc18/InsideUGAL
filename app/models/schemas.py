from __future__ import annotations

from enum import Enum
from typing import Generic, Optional, List, TypeVar
from uuid import UUID
from datetime import datetime, time
from decimal import Decimal
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator
from typing import Dict, Any

# Importuri adăugate pentru conversia coordonatelor PostGIS
from geoalchemy2.elements import WKBElement
from geoalchemy2.shape import to_shape

# ==========================================
# ENUM-URI
# ==========================================
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    total_pages: int


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
    faculty_id: Optional[int] = None

class ProfileResponse(ProfileBase):
    id: UUID
    faculty_id: Optional[int] = None
    faculty: Optional[FacultyResponse] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# FACULTIES & LOCATIONS
# ==========================================
class Coordinates(BaseModel):
    latitude: float
    longitude: float

class FacultyBase(BaseModel):
    name: str
    abbreviation: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website_url: Optional[str] = None
    dormitory_url: Optional[str] = None
    logo_url: Optional[str] = None

class FacultyCreate(FacultyBase):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "Facultatea de Inginerie",
            "abbreviation": "ING",
            "description": "Facultatea de Inginerie din cadrul Universității Dunărea de Jos din Galați",
            "address": "Str. Domnească nr. 111, Galați",
            "phone": "+40 236 130 208",
            "website_url": "https://ing.ugal.ro",
            "dormitory_url": "https://campus.ugal.ro"
        }
    })

class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    abbreviation: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website_url: Optional[str] = None
    dormitory_url: Optional[str] = None
    logo_url: Optional[str] = None

class FacultyResponse(FacultyBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LocationBase(BaseModel):
    name: str
    faculty_ids: List[int] = []
    facility_id: Optional[int] = None
    marker: Optional[str] = None
    coordinates: Optional[Coordinates] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    faculty_ids: Optional[List[int]] = None
    facility_id: Optional[int] = None
    marker: Optional[str] = None
    coordinates: Optional[Coordinates] = None

class LocationResponse(LocationBase):
    id: int
    image_url: Optional[str] = None
    faculties: List[FacultyResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

    # Validator adăugat pentru a transforma datele din baza de date în format Pydantic
    @field_validator('coordinates', mode='before')
    @classmethod
    def convert_wkb_to_coordinates(cls, value):
        if isinstance(value, WKBElement):
            try:
                # Convertim WKB în formă Shapely (Punct)
                point = to_shape(value)
                # La PostGIS/Shapely standard: x = longitudine, y = latitudine
                return {"latitude": point.y, "longitude": point.x}
            except Exception as e:
                # În caz de eroare la conversie, returnăm None ca să nu crape aplicația
                print(f"Eroare la conversia WKBElement: {e}")
                return None
        return value


class FacilityScheduleBase(BaseModel):
    day_of_week: int
    open_time: time
    close_time: time


class FacilityScheduleCreate(FacilityScheduleBase):
    facility_id: Optional[int] = None


class FacilityScheduleUpdate(BaseModel):
    day_of_week: Optional[int] = None
    open_time: Optional[time] = None
    close_time: Optional[time] = None


class FacilityScheduleResponse(FacilityScheduleBase):
    id: int
    facility_id: int
    model_config = ConfigDict(from_attributes=True)


class FacilityBase(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None


class FacilityCreate(FacilityBase):
    pass


class FacilityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None


class FacilityResponse(FacilityBase):
    id: int
    schedules: List[FacilityScheduleResponse] = []
    locations: List[LocationResponse] = []
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


class CityGuideCategoryBase(BaseModel):
    title: str
    description: str
    icon_name: str


class CityGuideCategoryCreate(CityGuideCategoryBase):
    id: str


class CityGuideCategoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    icon_name: Optional[str] = None


class CityGuideCategoryResponse(CityGuideCategoryBase):
    id: str
    model_config = ConfigDict(from_attributes=True)


class CityGuideItemBase(BaseModel):
    title: str
    category_id: str = Field(
        validation_alias=AliasChoices("categoryId", "category_id"),
        serialization_alias="categoryId",
    )
    image_url: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)


class CityGuideItemCreate(CityGuideItemBase):
    pass


class CityGuideItemUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("categoryId", "category_id"),
        serialization_alias="categoryId",
    )
    image_url: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True)


class CityGuideItemResponse(CityGuideItemBase):
    id: int
    category: Optional[CityGuideCategoryResponse] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ProductCategoryBase(BaseModel):
    name: str


class ProductCategoryCreate(ProductCategoryBase):
    pass


class ProductCategoryUpdate(BaseModel):
    name: Optional[str] = None


class ProductCategoryResponse(ProductCategoryBase):
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
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "title": "Priză defectă în corpul D",
            "description": "Priza din sala D12 scoate scântei la fiecare conectare.",
            "location_id": 1,
            "image_url": "https://example.com/images/complaint.jpg"
        }
    })

class ComplaintUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ComplaintStatus] = None

class ComplaintResponse(ComplaintBase):
    id: int
    user_id: UUID
    author_name: Optional[str] = None
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
    event_link: Optional[str] = None
    files: Optional[List[Dict[str, Any]]] = []
    faculties: Optional[List[str]] = []
    location_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AnnouncementCreate(AnnouncementBase):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "type": "EVENIMENT",
            "title": "Hackathon UGAL 2024",
            "content": "Vă așteptăm la hackathon-ul ediția 2024! Cele mai bune proiecte vor fi premiate.",
            "image_url": "https://example.com/images/hackathon.jpg",
            "event_link": "https://example.com/register",
            "files": [{"name": "regulament.pdf", "url": "https://example.com/regulament.pdf"}],
            "faculties": ["AC", "FIE", "Drept"],
            "location_name": "Corpul C",
            "start_date": "2024-06-15T09:00:00",
            "end_date": "2024-06-15T18:00:00"
        }
    })

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[PostType] = None
    image_url: Optional[str] = None
    event_link: Optional[str] = None
    files: Optional[List[Dict[str, Any]]] = None
    faculties: Optional[List[str]] = None
    location_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AnnouncementResponse(AnnouncementBase):
    id: int
    created_by: UUID
    author: Optional[str] = Field(alias="author_name", default=None)
    is_translated: bool = False
    translated_title: Optional[str] = None
    translated_content: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ==========================================
# PRODUCTS (PRODUSE CANTINĂ)
# ==========================================
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: str
    price: Decimal

class ProductCreate(ProductBase):
    category_id: Optional[int] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[str] = None
    price: Optional[Decimal] = None
    category_id: Optional[int] = None

class ProductResponse(ProductBase):
    id: int
    category_id: Optional[int] = None
    category: Optional[ProductCategoryResponse] = None
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
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "day_of_week": 1,
            "product_ids": [1, 2, 3]
        }
    })


class DailyMenuUpdate(BaseModel):
    day_of_week: Optional[int] = None
    product_ids: Optional[List[int]] = None


class DailyMenuResponse(DailyMenuBase):
    id: int
    products: List[ProductResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DashboardStatsResponse(BaseModel):
    total_users: int
    complaints_stats: Dict[str, int]
    recent_announcements: List[Dict[str, Any]]


# ==========================================
# NOTIFICATIONS
# ==========================================
class NotificationBase(BaseModel):
    title: str
    body: str
    action: Optional[str] = None
    faculty_id: Optional[int] = None


class NotificationCreate(NotificationBase):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "title": "Anunț important",
            "body": "Textul notificării...",
            "action": "https://example.com",
            "faculty_id": 1
        }
    })


class NotificationResponse(NotificationBase):
    id: int
    sent_by: UUID
    sent_at: datetime
    recipient_count: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)