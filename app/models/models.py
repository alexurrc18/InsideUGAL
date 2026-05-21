from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, func, Index
from sqlalchemy.orm import relationship, validates
from app.db.database import Base


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    __table_args__ = (
        Index("idx_users_email_active", "email", "is_active"),
    )

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    @validates("email")
    def validate_email(self, key, address):
        if "@" not in address:
            raise ValueError("Invalid email address")
        return address

    student = relationship("Student", back_populates="user", uselist=False)
    professor = relationship("Professor", back_populates="user", uselist=False)


class Student(Base, TimestampMixin):
    __tablename__ = "students"

    __table_args__ = (
        Index("idx_students_faculty_year", "faculty_id", "year"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=True)
    year = Column(Integer, nullable=True)
    student_id = Column(String, unique=True, nullable=True)

    user = relationship("User", back_populates="student")
    faculty = relationship("Faculty", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student")


class Professor(Base, TimestampMixin):
    __tablename__ = "professors"

    __table_args__ = (
        Index("idx_professors_faculty", "faculty_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=True)

    user = relationship("User", back_populates="professor")
    faculty = relationship("Faculty", back_populates="professors")
    courses = relationship("Course", back_populates="professor")


class Faculty(Base, TimestampMixin):
    __tablename__ = "faculties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    abbreviation = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)

    students = relationship("Student", back_populates="faculty")
    professors = relationship("Professor", back_populates="faculty")
    courses = relationship("Course", back_populates="faculty")


class Course(Base, TimestampMixin):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=False)
    professor_id = Column(Integer, ForeignKey("professors.id"), nullable=True)
    credits = Column(Integer, default=3)
    semester = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)

    faculty = relationship("Faculty", back_populates="courses")
    professor = relationship("Professor", back_populates="courses")
    enrollments = relationship("Enrollment", back_populates="course")


class Announcement(Base, TimestampMixin):
    __tablename__ = "announcements"

    __table_args__ = (
        Index("idx_announcements_created", "created_at"),
        Index("idx_announcements_pinned", "is_pinned"),
    )

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_pinned = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    creator = relationship("User")


class Enrollment(Base, TimestampMixin):
    __tablename__ = "enrollments"

    __table_args__ = (Index("idx_enrollments_unique", "student_id", "course_id", unique=True),)

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    grade = Column(String, nullable=True)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")