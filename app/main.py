import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

import app.api.announcements as announcements
import app.api.auth as auth
import app.api.cafeteria_menus as cafeteria_menus
import app.api.categories as categories
import app.api.complaints as complaints
import app.api.daily_menus as daily_menus
import app.api.faculties as faculties
import app.api.locations as locations
import app.api.products as products
import app.api.profiles as profiles
from app.api.errors import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="InsideUGAL API",
    description="REST API pentru platforma academica InsideUGAL.",
    version="2.0.0",
    exception_handlers={
        Exception: global_exception_handler,
        StarletteHTTPException: http_exception_handler,
        RequestValidationError: validation_exception_handler,
    },
)


@app.middleware("http")
async def add_request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    logger.info("Processing %s %s | Request-ID: %s", request.method, request.url.path, request_id)

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


app.include_router(profiles.router)
app.include_router(faculties.router)
app.include_router(categories.router)
app.include_router(locations.router)
app.include_router(products.router)
app.include_router(daily_menus.router)
app.include_router(cafeteria_menus.router)
app.include_router(complaints.router)
app.include_router(announcements.router)
app.include_router(auth.router)
