from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StrictStr


EmailString = Annotated[
    StrictStr,
    Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"),
]
NameString = Annotated[StrictStr, Field(min_length=1, max_length=255)]
PasswordString = Annotated[StrictStr, Field(min_length=8, max_length=128)]


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ORMStrictSchema(StrictSchema):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        from_attributes=True,
    )


class UserBase(StrictSchema):
    email: EmailString
    full_name: NameString


class UserCreate(UserBase):
    password: PasswordString


class UserResponse(ORMStrictSchema):
    id: StrictInt
    email: EmailString
    full_name: NameString
    is_active: StrictBool
    is_admin: StrictBool
    created_at: datetime
    updated_at: datetime


UserInDB = UserResponse


class Token(StrictSchema):
    access_token: StrictStr
    token_type: StrictStr


class TokenData(StrictSchema):
    user_id: Optional[StrictInt] = None


class StudentBase(StrictSchema):
    year: Optional[StrictInt] = None
    student_id: Optional[StrictStr] = None


class StudentCreate(StudentBase):
    user_id: StrictInt
    faculty_id: Optional[StrictInt] = None


class StudentInDB(ORMStrictSchema):
    id: StrictInt
    user_id: StrictInt
    faculty_id: Optional[StrictInt] = None
    year: Optional[StrictInt] = None
    student_id: Optional[StrictStr] = None
    created_at: datetime
    updated_at: datetime


class ProfessorBase(StrictSchema):
    pass


class ProfessorCreate(ProfessorBase):
    user_id: StrictInt
    faculty_id: Optional[StrictInt] = None


class ProfessorInDB(ORMStrictSchema):
    id: StrictInt
    user_id: StrictInt
    faculty_id: Optional[StrictInt] = None
    created_at: datetime
    updated_at: datetime


class FacultyBase(StrictSchema):
    name: Annotated[StrictStr, Field(min_length=1, max_length=255)]
    abbreviation: Annotated[StrictStr, Field(min_length=1, max_length=50)]
    description: Optional[StrictStr] = None


class FacultyCreate(FacultyBase):
    pass


class FacultyInDB(ORMStrictSchema):
    id: StrictInt
    name: StrictStr
    abbreviation: StrictStr
    description: Optional[StrictStr] = None
    created_at: datetime
    updated_at: datetime


class CourseBase(StrictSchema):
    name: Annotated[StrictStr, Field(min_length=1, max_length=255)]
    code: Annotated[StrictStr, Field(min_length=1, max_length=50)]
    description: Optional[StrictStr] = None
    credits: StrictInt = 3
    semester: Optional[StrictInt] = None
    year: Optional[StrictInt] = None


class CourseCreate(CourseBase):
    faculty_id: StrictInt
    professor_id: Optional[StrictInt] = None


class CourseInDB(ORMStrictSchema):
    id: StrictInt
    name: StrictStr
    code: StrictStr
    description: Optional[StrictStr] = None
    faculty_id: StrictInt
    professor_id: Optional[StrictInt] = None
    credits: StrictInt
    semester: Optional[StrictInt] = None
    year: Optional[StrictInt] = None
    created_at: datetime
    updated_at: datetime


class AnnouncementBase(StrictSchema):
    title: Annotated[StrictStr, Field(min_length=1, max_length=255)]
    content: Annotated[StrictStr, Field(min_length=1)]
    is_pinned: StrictBool = False
    expires_at: Optional[datetime] = None


class AnnouncementCreate(AnnouncementBase):
    created_by: StrictInt


class AnnouncementUpdate(StrictSchema):
    title: Optional[Annotated[StrictStr, Field(min_length=1, max_length=255)]] = None
    content: Optional[Annotated[StrictStr, Field(min_length=1)]] = None
    is_pinned: Optional[StrictBool] = None
    expires_at: Optional[datetime] = None


class AnnouncementInDB(ORMStrictSchema):
    id: StrictInt
    title: StrictStr
    content: StrictStr
    created_by: StrictInt
    is_pinned: StrictBool
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class EnrollmentBase(StrictSchema):
    grade: Optional[StrictStr] = None


class EnrollmentCreate(StrictSchema):
    student_id: StrictInt
    course_id: StrictInt


class EnrollmentInDB(ORMStrictSchema):
    id: StrictInt
    student_id: StrictInt
    course_id: StrictInt
    grade: Optional[StrictStr] = None
    enrolled_at: datetime
    created_at: datetime
    updated_at: datetime
