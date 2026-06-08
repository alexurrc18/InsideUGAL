import pytest
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse
from unittest.mock import MagicMock

from app.api.errors import (
    validation_exception_handler,
    http_exception_handler,
    global_exception_handler,
)


@pytest.fixture
def mock_request() -> MagicMock:
    request = MagicMock(spec=Request)
    request.url.path = "/test-endpoint"
    return request


@pytest.mark.asyncio
async def test_validation_exception_handler_returns_problem_json(mock_request: MagicMock) -> None:
    exc = RequestValidationError(
        errors=[{"type": "value_error", "loc": ["body", "field"], "msg": "Invalid input"}]
    )

    response = await validation_exception_handler(mock_request, exc)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert response.media_type == "application/problem+json"
    body = response.body
    assert b"Validation Error" in body
    assert b"422" in body
    assert b"Invalid input" in body


@pytest.mark.asyncio
async def test_validation_exception_handler_stringifies_non_serializable_error(mock_request: MagicMock) -> None:
    class NonSerializableError(Exception):
        pass

    exc = RequestValidationError(
        errors=[
            {
                "type": "value_error",
                "loc": ["body", "field"],
                "msg": "Value error",
                "input": {},
                "ctx": {"error": NonSerializableError("nested error")},
            }
        ]
    )

    response = await validation_exception_handler(mock_request, exc)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert response.media_type == "application/problem+json"
    body = response.body
    assert b"Value error" in body


@pytest.mark.asyncio
async def test_http_exception_handler_standard_format(mock_request: MagicMock) -> None:
    http_exc = StarletteHTTPException(status_code=404, detail="Item not found")

    response = await http_exception_handler(mock_request, http_exc)

    assert response.status_code == 404
    assert response.media_type == "application/problem+json"
    body = response.body
    assert b"Not Found" in body
    assert b"Item not found" in body


@pytest.mark.asyncio
async def test_http_exception_handler_with_value_error_detail(mock_request: MagicMock) -> None:
    class NonSerializable(Exception):
        pass

    http_exc = StarletteHTTPException(
        status_code=422,
        detail=NonSerializable("Something went wrong"),
    )

    response = await http_exception_handler(mock_request, http_exc)

    assert response.status_code == 422
    assert response.media_type == "application/problem+json"
    body = response.body.decode()
    assert "Something went wrong" in body


@pytest.mark.asyncio
async def test_global_exception_handler_returns_500(mock_request: MagicMock) -> None:
    exc = RuntimeError("Database connection failed")

    response = await global_exception_handler(mock_request, exc)

    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert response.media_type == "application/problem+json"
    body = response.body
    assert b"Internal Server Error" in body
    assert b"Database connection failed" not in body
