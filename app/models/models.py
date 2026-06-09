# app/models/models.py
from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship

from app.db.database import Base


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# Tabelul de legatura pentru meniul zilei (Multe-la-Multe)
menu_products = Table(
    "menu_products",
    Base.metadata,
    Column("menu_id", Integer, ForeignKey("public.daily_menus.id", ondelete="CASCADE"), primary_key=True),
    Column("product_id", Integer, ForeignKey("public.products.id", ondelete="CASCADE"), primary_key=True),
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
    
    role = Column(ENUM('STUDENT', 'STUDENT_RESPONSABIL', 'PROFESOR', 'HEAD_CANTINA', 'HEAD_FACULTATI', 'HEAD_ADMIN', name='user_role', create_type=False), nullable=False, server_default="STUDENT")
    is_active = Column(Boolean, nullable=False, default=True)

    complaints = relationship("Complaint", back_populates="user")
    announcements = relationship("Announcement", back_populates="creator")


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

    locations = relationship("Location", back_populates="faculty")
    announcements = relationship("Announcement", back_populates="faculty")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)


class Location(Base, TimestampMixin):
    __tablename__ = "locations"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    coordinates = Column(Geometry(geometry_type="POINT", srid=4326))
    faculty_id = Column(Integer, ForeignKey("public.faculties.id", ondelete="SET NULL"))

    faculty = relationship("Faculty", back_populates="locations")
    complaints = relationship("Complaint", back_populates="location")


class Product(Base, TimestampMixin):
    __tablename__ = "products"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    quantity = Column(String(50), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)

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
    
    status = Column(ENUM('in_asteptare', 'in_lucru', 'finalizat', 'respins', name='complaint_status', create_type=False), nullable=False, server_default="in_asteptare")

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
    faculty_id = Column(Integer, ForeignKey("public.faculties.id", ondelete="SET NULL"))
    location_name = Column(String(255))
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))

    creator = relationship("Profile", back_populates="announcements")
    faculty = relationship("Faculty", back_populates="announcements")



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