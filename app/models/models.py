from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    student = relationship("Student", back_populates="user", uselist=False)
    professor = relationship("Professor", back_populates="user", uselist=False)


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=True)
    year = Column(Integer, nullable=True)

    user = relationship("User", back_populates="student")
    faculty = relationship("Faculty", back_populates="students")


class Professor(Base):
    __tablename__ = "professors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=True)

    user = relationship("User", back_populates="professor")
    faculty = relationship("Faculty", back_populates="professors")


class Faculty(Base):
    __tablename__ = "faculties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    abbreviation = Column(String, nullable=False)

    students = relationship("Student", back_populates="faculty")
    professors = relationship("Professor", back_populates="faculty")
    courses = relationship("Course", back_populates="faculty")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id"))

    faculty = relationship("Faculty", back_populates="courses")


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, nullable=False)

    creator = relationship("User")