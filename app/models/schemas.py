from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    email: str
    full_name: str


class UserCreate(UserBase):
    password: str


class UserInDB(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


class StudentBase(BaseModel):
    year: Optional[int] = None
    student_id: Optional[str] = None


class StudentCreate(StudentBase):
    user_id: int
    faculty_id: Optional[int] = None


class StudentInDB(StudentBase):
    id: int
    user_id: int
    faculty_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfessorBase(BaseModel):
    pass


class ProfessorCreate(ProfessorBase):
    user_id: int
    faculty_id: Optional[int] = None


class ProfessorInDB(ProfessorBase):
    id: int
    user_id: int
    faculty_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FacultyBase(BaseModel):
    name: str
    abbreviation: str
    description: Optional[str] = None


class FacultyCreate(FacultyBase):
    pass


class FacultyInDB(FacultyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CourseBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    credits: int = 3
    semester: Optional[int] = None
    year: Optional[int] = None


class CourseCreate(CourseBase):
    faculty_id: int
    professor_id: Optional[int] = None


class CourseInDB(CourseBase):
    id: int
    faculty_id: int
    professor_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnnouncementBase(BaseModel):
    title: str
    content: str
    is_pinned: bool = False
    expires_at: Optional[datetime] = None


class AnnouncementCreate(AnnouncementBase):
    created_by: int


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    expires_at: Optional[datetime] = None


class AnnouncementInDB(AnnouncementBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EnrollmentBase(BaseModel):
    grade: Optional[str] = None


class EnrollmentCreate(BaseModel):
    student_id: int
    course_id: int


class EnrollmentInDB(EnrollmentBase):
    id: int
    student_id: int
    course_id: int
    enrolled_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
