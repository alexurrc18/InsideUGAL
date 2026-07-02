# app/models/models.py
from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID, ENUM
from sqlalchemy.orm import relationship

from app.db.database import Base


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


menu_products = Table(
    "menu_products",
    Base.metadata,
    Column("menu_id", Integer, ForeignKey("public.daily_menus.id", ondelete="CASCADE"), primary_key=True),
    Column("product_id", Integer, ForeignKey("public.products.id", ondelete="CASCADE"), primary_key=True),
    schema="public",
)


location_faculties = Table(
    "location_faculties",
    Base.metadata,
    Column("location_id", Integer, ForeignKey("public.locations.id", ondelete="CASCADE"), primary_key=True),
    Column("faculty_id", Integer, ForeignKey("public.faculties.id", ondelete="CASCADE"), primary_key=True),
    schema="public",
)


announcement_faculties = Table(
    "announcement_faculties",
    Base.metadata,
    Column("announcement_id", Integer, ForeignKey("public.announcements.id", ondelete="CASCADE"), primary_key=True),
    Column("faculty_id", Integer, ForeignKey("public.faculties.id", ondelete="CASCADE"), primary_key=True),
    schema="public",
)


class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"
    __table_args__ = {"schema": "public"}

    # Nu forța lambda: uuid.uuid4() aici, lăsăm Supabase să ne dea ID-ul sau îl dăm din router.
    id = Column(UUID(as_uuid=False), primary_key=True)
    username = Column(String(100), unique=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    faculty_id = Column(Integer, ForeignKey("public.faculties.id", ondelete="SET NULL"), nullable=True)
    
    role = Column(ENUM('STUDENT', 'STUDENT_RESPONSABIL', 'PROFESOR', 'HEAD_CANTINA', 'HEAD_FACULTATI', 'HEAD_ADMIN', name='user_role', create_type=False), nullable=False, server_default="STUDENT")
    is_active = Column(Boolean, nullable=False, default=True)

    faculty = relationship("Faculty", back_populates="profiles")
    complaints = relationship("Complaint", back_populates="user")
    announcements = relationship("Announcement", back_populates="creator")
    push_tokens = relationship("PushToken", back_populates="profile")


class Faculty(Base, TimestampMixin):
    __tablename__ = "faculties"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    abbreviation = Column(String(50))
    description = Column(Text)
    address = Column(Text)
    phone = Column(String(50))
    website_url = Column(Text)
    dormitory_url = Column(Text)
    logo_url = Column(Text)

    locations = relationship("Location", secondary=location_faculties, back_populates="faculties")
    profiles = relationship("Profile", back_populates="faculty")
    announcements = relationship("Announcement", secondary=announcement_faculties, back_populates="faculties")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)


class CityGuideCategory(Base):
    __tablename__ = "city_guide_categories"
    __table_args__ = {"schema": "public"}

    id = Column(String(100), primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    icon_name = Column(String(100), nullable=False)

    items = relationship("CityGuideItem", back_populates="category", cascade="all, delete-orphan")


class CityGuideItem(Base, TimestampMixin):
    __tablename__ = "city_guide_items"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    category_id = Column(String(100), ForeignKey("public.city_guide_categories.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(Text)
    address = Column(Text)
    website = Column(Text)

    category = relationship("CityGuideCategory", back_populates="items")


class ProductCategory(Base):
    __tablename__ = "product_categories"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)

    products = relationship("Product", back_populates="category")


class Location(Base, TimestampMixin):
    __tablename__ = "locations"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    coordinates = Column(Geometry(geometry_type="POINT", srid=4326))
    facility_id = Column(Integer, ForeignKey("public.facilities.id", ondelete="SET NULL"))
    marker = Column(String(10))

    faculties = relationship("Faculty", secondary=location_faculties, back_populates="locations")
    facility = relationship("Facility", back_populates="locations")
    complaints = relationship("Complaint", back_populates="location")


class Facility(Base, TimestampMixin):
    __tablename__ = "facilities"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    image_url = Column(Text)

    locations = relationship("Location", back_populates="facility")
    schedules = relationship(
        "FacilitySchedule",
        back_populates="facility",
        cascade="all, delete-orphan",
        order_by="FacilitySchedule.day_of_week",
    )


class FacilitySchedule(Base):
    __tablename__ = "facility_schedules"
    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 1 AND 7", name="ck_facility_schedules_day_of_week"),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True)
    facility_id = Column(Integer, ForeignKey("public.facilities.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)
    open_time = Column(Time, nullable=False)
    close_time = Column(Time, nullable=False)

    facility = relationship("Facility", back_populates="schedules")


class Product(Base, TimestampMixin):
    __tablename__ = "products"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    quantity = Column(String(50), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("public.product_categories.id", ondelete="SET NULL"))

    category = relationship("ProductCategory", back_populates="products")
    daily_menus = relationship("DailyMenu", secondary=menu_products, back_populates="products")


class DailyMenu(Base, TimestampMixin):
    __tablename__ = "daily_menus"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    day_of_week = Column(Integer, nullable=False)

    products = relationship("Product", secondary=menu_products, back_populates="daily_menus", lazy="selectin")


class Complaint(Base, TimestampMixin):
    __tablename__ = "complaints"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=False), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    location_id = Column(Integer, ForeignKey("public.locations.id", ondelete="SET NULL"))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(Text)
    
    status = Column(ENUM('in_asteptare', 'in_lucru', 'finalizat', 'respins', 'solutionat', name='complaint_status', create_type=False), nullable=False, server_default="in_asteptare")

    user = relationship("Profile", back_populates="complaints")
    location = relationship("Location", back_populates="complaints")


class Announcement(Base, TimestampMixin):
    __tablename__ = "announcements"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)

    type = Column(ENUM('NOUTATE', 'EVENIMENT', name='post_type', create_type=False), nullable=False, server_default="NOUTATE")

    created_by = Column(UUID(as_uuid=False), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255))
    content = Column(Text, nullable=False)
    image_url = Column(Text)
    event_link = Column(String(500))
    files = Column(JSONB, nullable=False, server_default="[]")
    location_name = Column(String(255))
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))

    creator = relationship("Profile", back_populates="announcements")
    faculties = relationship("Faculty", secondary=announcement_faculties, back_populates="announcements", lazy="selectin")
    translations = relationship(
        "AnnouncementTranslation",
        back_populates="announcement",
        cascade="all, delete-orphan",
    )


class AnnouncementTranslation(Base, TimestampMixin):
    __tablename__ = "announcement_translations"
    __table_args__ = (
        UniqueConstraint("announcement_id", "language_code", name="uq_announcement_language"),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True)
    announcement_id = Column(Integer, ForeignKey("public.announcements.id", ondelete="CASCADE"), nullable=False)
    language_code = Column(String(10), nullable=False)
    translated_title = Column(String(255), nullable=False)
    translated_content = Column(Text, nullable=False)

    announcement = relationship("Announcement", back_populates="translations")


class LLMCall(Base):
    __tablename__ = "llm_calls"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid())
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    function_name = Column(Text, nullable=False)
    model = Column(Text, nullable=False)
    prompt_tokens = Column(Integer, default=0)
    response_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cached = Column(Boolean, default=False)
    duration_ms = Column(Integer)


class QuestionsHistory(Base):
    __tablename__ = "questions_history"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Am adăugat legătura cu userul (studentul care întreabă), cerută în issue
    user_id = Column(UUID(as_uuid=False), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    
    pdf_id = Column(Text, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)


class PushToken(Base, TimestampMixin):
    __tablename__ = "push_tokens"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    profile_id = Column(UUID(as_uuid=False), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    token = Column(Text, nullable=False)
    device_type = Column(String(50))
    is_valid = Column(Boolean, nullable=False, default=True)
    last_used_at = Column(DateTime(timezone=True))

    profile = relationship("Profile", back_populates="push_tokens")


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    action = Column(String(500))
    faculty_id = Column(Integer, ForeignKey("public.faculties.id", ondelete="SET NULL"))
    sent_by = Column(UUID(as_uuid=False), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    recipient_count = Column(Integer, nullable=False, default=0)

    sent_by_profile = relationship("Profile", foreign_keys=[sent_by])
    faculty = relationship("Faculty")

