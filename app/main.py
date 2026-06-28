# app/main.py
import logging
import uuid
import os
import datetime
import app.api.dashboard as dashboard
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

import app.api.announcements as announcements
import app.api.auth as auth
import app.api.cafeteria_menus as cafeteria_menus
import app.api.categories as categories
import app.api.complaints as complaints
import app.api.daily_menus as daily_menus
import app.api.faculties as faculties
import app.api.facilities as facilities
import app.api.llm as llm
import app.api.llm_stream as llm_stream
import app.api.locations as locations
import app.api.products as products
import app.api.product_categories as product_categories
import app.api.profiles as profiles
import app.api.uploads as uploads
from app.api.errors import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.middleware.timing import TimingMiddleware
from app.middleware.translation import TranslationMiddleware
from app.rate_limit import limiter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Variabila de mediu pentru a proteja mediul local
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )

# Determine backend URL from environment for Swagger UI / OpenAPI documentation
backend_url = os.getenv("NEXT_PUBLIC_BACKEND_URL")
servers_list = []
if backend_url:
    servers_list.append({"url": backend_url, "description": "Backend Server"})
servers_list.append({"url": "/", "description": "Local/Relative"})

app = FastAPI(
    title="InsideUGAL API",
    description="API-ul platformei InsideUGAL...",
    version="1.0.0",
    servers=servers_list,
    exception_handlers={
        Exception: global_exception_handler,
        StarletteHTTPException: http_exception_handler,
        RequestValidationError: validation_exception_handler,
    },
)

@app.get("/health")
async def health_check():
        return {
            "status": "online",
            "db_status": "connected",
            "timestamp": datetime.datetime.now().isoformat()
        }


# --- 1. Rate Limiting Configuration ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# --- 2. TrustedHost Middleware ---
allowed_hosts_raw = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,*.local,test")
allowed_hosts = [host.strip() for host in allowed_hosts_raw.split(",") if host.strip()]

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts,
)

# --- 3. Custom HTTP Middlewares ---
@app.middleware("http")
async def add_security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # HSTS aplicat DOAR în producție
    if ENVIRONMENT == "production":
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

# --- 4. Timing & SlowAPI ---
app.add_middleware(TimingMiddleware)
app.add_middleware(SlowAPIMiddleware)

# --- 4.5. Translation ---
app.add_middleware(TranslationMiddleware)

# --- 5. CORS Middleware (MUTAT LA FINAL) ---
# OBLIGATORIU: Trebuie să fie ultimul adăugat pentru a fi primul care lovește request-ul browser-ului!
allowed_origins_raw = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
)
# Aici eliminăm orice slash pus accidental la finalul IP-ului în .env
allowed_origins = [origin.strip().rstrip("/") for origin in allowed_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 6. Rutele aplicației ---
app.include_router(profiles.router)
app.include_router(faculties.router)
app.include_router(facilities.router)
app.include_router(categories.router)
app.include_router(locations.router)
app.include_router(product_categories.router)
app.include_router(products.router)
app.include_router(daily_menus.router)
app.include_router(cafeteria_menus.router)
app.include_router(complaints.router)
app.include_router(announcements.router)
app.include_router(auth.router)
app.include_router(llm.router)
app.include_router(llm_stream.router)
app.include_router(uploads.router)
app.include_router(dashboard.router)