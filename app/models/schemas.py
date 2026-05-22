from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StrictStr


EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OrmResponseSchema(StrictSchema):
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
        str_strip_whitespace=True,
    )


class UserBase(StrictSchema):
    email: StrictStr = Field(..., max_length=255, pattern=EMAIL_PATTERN)
    full_name: StrictStr = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    password: StrictStr = Field(..., min_length=8, max_length=255)


class UserUpdate(StrictSchema):
    email: StrictStr | None = Field(default=None, max_length=255, pattern=EMAIL_PATTERN)
    full_name: StrictStr | None = Field(default=None, min_length=1, max_length=255)
    password: StrictStr | None = Field(default=None, min_length=8, max_length=255)
    is_active: StrictBool | None = None
    is_admin: StrictBool | None = None


class UserResponse(UserBase, OrmResponseSchema):
    id: StrictInt
    is_active: StrictBool
    is_admin: StrictBool
    created_at: datetime
    updated_at: datetime


class FacultyBase(StrictSchema):
    name: StrictStr = Field(..., min_length=1, max_length=255)
    abbreviation: StrictStr = Field(..., min_length=1, max_length=50)
    description: StrictStr | None = None


class FacultyCreate(FacultyBase):
    pass


class FacultyUpdate(StrictSchema):
    name: StrictStr | None = Field(default=None, min_length=1, max_length=255)
    abbreviation: StrictStr | None = Field(default=None, min_length=1, max_length=50)
    description: StrictStr | None = None


class FacultyResponse(FacultyBase, OrmResponseSchema):
    id: StrictInt
    created_at: datetime
    updated_at: datetime


class CourseBase(StrictSchema):
    name: StrictStr = Field(..., min_length=1, max_length=255)
    code: StrictStr = Field(..., min_length=1, max_length=50)
    description: StrictStr | None = None
    faculty_id: StrictInt = Field(..., gt=0)
    professor_id: StrictInt | None = Field(default=None, gt=0)
    credits: StrictInt = Field(default=3, gt=0)
    semester: StrictInt | None = Field(default=None, ge=1, le=2)
    year: StrictInt | None = Field(default=None, gt=0)


class CourseCreate(CourseBase):
    pass


class CourseUpdate(StrictSchema):
    name: StrictStr | None = Field(default=None, min_length=1, max_length=255)
    code: StrictStr | None = Field(default=None, min_length=1, max_length=50)
    description: StrictStr | None = None
    faculty_id: StrictInt | None = Field(default=None, gt=0)
    professor_id: StrictInt | None = Field(default=None, gt=0)
    credits: StrictInt | None = Field(default=None, gt=0)
    semester: StrictInt | None = Field(default=None, ge=1, le=2)
    year: StrictInt | None = Field(default=None, gt=0)


class CourseResponse(CourseBase, OrmResponseSchema):
    id: StrictInt
    created_at: datetime
    updated_at: datetime


class AnnouncementBase(StrictSchema):
    title: StrictStr = Field(..., min_length=1, max_length=255)
    content: StrictStr = Field(..., min_length=1)
    created_by: StrictInt = Field(..., gt=0)
    is_pinned: StrictBool = False
    expires_at: datetime | None = None


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(StrictSchema):
    title: StrictStr | None = Field(default=None, min_length=1, max_length=255)
    content: StrictStr | None = Field(default=None, min_length=1)
    created_by: StrictInt | None = Field(default=None, gt=0)
    is_pinned: StrictBool | None = None
    expires_at: datetime | None = None


class AnnouncementResponse(AnnouncementBase, OrmResponseSchema):
    id: StrictInt
    created_at: datetime
    updated_at: datetime
