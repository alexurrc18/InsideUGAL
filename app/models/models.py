import enum

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ENUM as PG_ENUM
from sqlalchemy.orm import relationship

from app.db.database import Base


# ==============================================================================
# 0. PLACEHOLDER PENTRU SCHEMA DE AUTENTIFICARE SUPABASE
# ==============================================================================
class AuthUser(Base):
    """Clasă dummy necesară pentru a valida constrângerile FK către auth.users."""
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}

    id = Column(PG_UUID(as_uuid=True), primary_key=True)


# ==============================================================================
# 1. ENUMS (Optimizate pentru driverul AsyncPG)
# ==============================================================================
class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    REPREZENTANT = "REPREZENTANT"
    PROFESOR = "PROFESOR"
    CANTINA_HEAD = "CANTINA_HEAD"
    FACULTATE_HEAD = "FACULTATE_HEAD"
    ADMIN = "ADMIN"


class ComplaintStatus(str, enum.Enum):
    NEW = "NEW"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


# Folosim PG_ENUM din dialectul de Postgres pentru a asigura o mapare asincronă corectă
user_role_enum = PG_ENUM(
    UserRole,
    name="user_role",
    schema="public",
    create_type=False,
)

complaint_status_enum = PG_ENUM(
    ComplaintStatus,
    name="complaint_status",
    schema="public",
    create_type=False,
)


# ==============================================================================
# 2. MIXINS & MODELS
# ==============================================================================
class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"
    __table_args__ = (
        Index("idx_profiles_role", "role"),
        {"schema": "public"},
    )

    id = Column(PG_UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(user_role_enum, nullable=False, server_default="STUDENT")
    is_active = Column(Boolean, default=True, server_default="true")

    complaints = relationship("Complaint", back_populates="user")
    announcements = relationship("Announcement", back_populates="creator")


class Faculty(Base, TimestampMixin):
    __tablename__ = "faculties"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    abbreviation = Column(String(50), unique=True, nullable=False)
    website_url = Column(Text)
    dormitory_url = Column(Text)
    description = Column(Text)

    locations = relationship("Location", back_populates="faculty")


class Location(Base, TimestampMixin):
    __tablename__ = "locations"
    __table_args__ = (
        Index("idx_locations_coordinates", "coordinates", postgresql_using="gist"),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    address = Column(Text)
    coordinates = Column(Geometry(geometry_type="POINT", srid=4326))
    faculty_id = Column(Integer, ForeignKey("public.faculties.id", ondelete="SET NULL"))

    faculty = relationship("Faculty", back_populates="locations")
    complaints = relationship("Complaint", back_populates="location")


class CafeteriaMenu(Base, TimestampMixin):
    __tablename__ = "cafeteria_menus"
    __table_args__ = (
        CheckConstraint("price > 0", name="cafeteria_menus_price_check"),
        CheckConstraint("grams > 0", name="cafeteria_menus_grams_check"),
        CheckConstraint("day_of_week BETWEEN 1 AND 5", name="cafeteria_menus_day_of_week_check"),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    description = Column(Text)
    calories = Column(Integer)
    proteins = Column(Numeric(5, 2))
    fats = Column(Numeric(5, 2))
    carbohydrates = Column(Numeric(5, 2))
    grams = Column(Integer, nullable=False)
    day_of_week = Column(Integer)
    is_available = Column(Boolean, default=True, server_default="true")


class Complaint(Base, TimestampMixin):
    __tablename__ = "complaints"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    location_id = Column(Integer, ForeignKey("public.locations.id", ondelete="SET NULL"))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(Text)
    status = Column(complaint_status_enum, nullable=False, server_default="NEW")

    user = relationship("Profile", back_populates="complaints")
    location = relationship("Location", back_populates="complaints")


class Announcement(Base, TimestampMixin):
    __tablename__ = "announcements"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50))
    image_url = Column(Text)
    is_event = Column(Boolean, default=False, server_default="false")
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    location_name = Column(String(255))
    target_audience = Column(String(100))
    event_redirect_id = Column(Integer, ForeignKey("public.announcements.id", ondelete="SET NULL"))
    send_push = Column(Boolean, default=False, server_default="false")
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)

    creator = relationship("Profile", back_populates="announcements")
