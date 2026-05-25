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
    payments = relationship("Payment", back_populates="user")
    announcements = relationship("Announcement", back_populates="creator")


class Faculty(Base, TimestampMixin):
    __tablename__ = "faculties"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    abbreviation = Column(String(50), unique=True, nullable=False)

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


class DormRoom(Base, TimestampMixin):
    __tablename__ = "dorm_rooms"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="dorm_rooms_capacity_check"),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True)
    building_name = Column(String(100), nullable=False)
    room_number = Column(String(20), nullable=False)
    capacity = Column(Integer, nullable=False)


class CafeteriaMenu(Base, TimestampMixin):
    __tablename__ = "cafeteria_menus"
    __table_args__ = (
        CheckConstraint("price > 0", name="cafeteria_menus_price_check"),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    calories = Column(Integer)
    proteins = Column(Numeric(5, 2))
    is_available = Column(Boolean, default=True, server_default="true")


class Complaint(Base, TimestampMixin):
    __tablename__ = "complaints"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    location_id = Column(Integer, ForeignKey("public.locations.id", ondelete="SET NULL"))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(complaint_status_enum, nullable=False, server_default="NEW")

    user = relationship("Profile", back_populates="complaints")
    location = relationship("Location", back_populates="complaints")


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="payments_amount_check"),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(String(255), nullable=False)
    status = Column(String(50), server_default="PENDING")

    user = relationship("Profile", back_populates="payments")


class Announcement(Base, TimestampMixin):
    __tablename__ = "announcements"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    event_date = Column(DateTime(timezone=True))
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)

    creator = relationship("Profile", back_populates="announcements")