import http
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    # Generăm un titlu standardizat în funcție de cod (ex: 404 -> "Not Found")
    try:
        title = http.HTTPStatus(exc.status_code).phrase
    except ValueError:
        title = "HTTP Error"
        
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "type": f"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/{exc.status_code}",
            "title": title,
            "status": exc.status_code,
            "detail": exc.detail,
            "instance": request.url.path,
        },
        media_type="application/problem+json",
    )

async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422",
            "title": "Validation Error",
            "status": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "detail": exc.errors(),
            "instance": request.url.path,
        },
        media_type="application/problem+json",
    )