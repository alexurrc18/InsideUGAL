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
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)


@app.get("/")
def read_root():
    return {"message": "InsideUGAL API ruleaza."}


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(users.router)
app.include_router(faculties.router)
app.include_router(courses.router)
app.include_router(announcements.router)
