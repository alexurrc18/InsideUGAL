from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import announcements, courses, faculties, users
from app.api.errors import http_exception_handler, validation_exception_handler
from app.models import models

app = FastAPI(
    title="InsideUGAL API",
    description="REST API pentru platforma academica InsideUGAL.",
    version="0.1.0",
    exception_handlers={
        StarletteHTTPException: http_exception_handler,
        RequestValidationError: validation_exception_handler,
    }
)

app.include_router(users.router)
app.include_router(faculties.router)
app.include_router(courses.router)
app.include_router(announcements.router)