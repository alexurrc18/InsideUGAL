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

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


class StudentBase(BaseModel):
    year: Optional[int] = None


class StudentCreate(StudentBase):
    pass


class StudentInDB(StudentBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class ProfessorBase(BaseModel):
    pass


class ProfessorCreate(ProfessorBase):
    pass


class ProfessorInDB(ProfessorBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class FacultyBase(BaseModel):
    name: str
    abbreviation: str


class FacultyCreate(FacultyBase):
    pass


class FacultyInDB(FacultyBase):
    id: int

    class Config:
        from_attributes = True


class CourseBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None


class CourseCreate(CourseBase):
    faculty_id: Optional[int] = None


class CourseInDB(CourseBase):
    id: int
    faculty_id: Optional[int] = None

    class Config:
        from_attributes = True


class AnnouncementBase(BaseModel):
    title: str
    content: str


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementInDB(AnnouncementBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True
