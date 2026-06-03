import logging
import uuid
import os

# Essential security and utility imports
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

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
from app import chat, llm_features

# Configurare logger pentru middleware
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Definire handler personalizat pentru Rate Limit (soluție pentru versiuni noi slowapi)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )

app = FastAPI(
    title="InsideUGAL API",
    description="REST API pentru platforma academica InsideUGAL.",
    version="0.1.0",
    exception_handlers={
        Exception: global_exception_handler,
        StarletteHTTPException: http_exception_handler,
        RequestValidationError: validation_exception_handler,
    }
)

# Rate Limiting Configuration
limiter = Limiter(key_func=get_remote_address, default_limits=["60 per minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# CORS Configuration
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host Configuration
allowed_hosts_raw = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,*.local")
allowed_hosts = [host.strip() for host in allowed_hosts_raw.split(",") if host.strip()]

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts,
)

@app.middleware("http")
async def add_security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

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
app.include_router(locations.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(daily_menus.router)
app.include_router(cafeteria_menus.router)
app.include_router(complaints.router)
app.include_router(announcements.router)
app.include_router(auth.router)
app.include_router(llm_features.router)
app.include_router(chat.router)
