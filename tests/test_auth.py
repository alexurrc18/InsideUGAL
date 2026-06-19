from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from supabase_auth.errors import AuthApiError

from app.main import app


@pytest.fixture(autouse=True, scope="module")
def mock_sqlalchemy_connect():
    mock_connection = AsyncMock()
    mock_context_manager = MagicMock()
    mock_context_manager.__aenter__.return_value = mock_connection

    with patch("sqlalchemy.ext.asyncio.engine.AsyncEngine.connect", return_value=mock_context_manager) as mock:
        yield mock


def get_fastapi_db_dependency():
    for key in app.dependency_overrides.keys():
        if getattr(key, "__name__", "") == "get_db":
            return key

    for route in app.routes:
        if hasattr(route, "dependant"):
            for sub_dependant in route.dependant.dependencies:
                if sub_dependant.call.__name__ == "get_db":
                    return sub_dependant.call
    return None


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture(autouse=True)
def override_db_dependency(mock_db):
    get_db = get_fastapi_db_dependency()

    if get_db:
        async def _get_db_override():
            yield mock_db

        app.dependency_overrides[get_db] = _get_db_override

    yield
    if get_db:
        app.dependency_overrides.pop(get_db, None)


def auth_response(
    *,
    access_token: str = "mocked_valid_jwt_token",
    refresh_token: str = "mocked_refresh_token",
):
    return SimpleNamespace(
        session=SimpleNamespace(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=3600,
            expires_at=1900000000,
        )
    )


@pytest.mark.asyncio
@patch("app.api.auth.get_supabase_client")
async def test_login_success(mock_get_supabase_client, client):
    mock_supabase = MagicMock()
    mock_supabase.auth.sign_in_with_password.return_value = auth_response()
    mock_get_supabase_client.return_value = mock_supabase

    response = await client.post(
        "/auth/login",
        data={"username": "student@student.graphql.ro", "password": "ParolaUgal123!"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] == "mocked_valid_jwt_token"
    assert data["refresh_token"] == "mocked_refresh_token"
    assert data["token_type"] == "bearer"
    mock_supabase.auth.sign_in_with_password.assert_called_once_with(
        {
            "email": "student@student.graphql.ro",
            "password": "ParolaUgal123!",
        }
    )


@pytest.mark.asyncio
@patch("app.api.auth.get_supabase_client")
async def test_login_unauthorized_wrong_credentials(mock_get_supabase_client, client):
    mock_supabase = MagicMock()
    mock_supabase.auth.sign_in_with_password.side_effect = AuthApiError(
        "Invalid login credentials",
        401,
        "invalid_credentials",
    )
    mock_get_supabase_client.return_value = mock_supabase

    response = await client.post(
        "/auth/login",
        data={"username": "gresit@ugal.ro", "password": "ParolaGresita"},
    )

    assert response.status_code == 401
    assert "Supabase authentication failed" in response.json()["detail"]


@pytest.mark.asyncio
@patch("app.api.auth.get_supabase_client")
async def test_refresh_success(mock_get_supabase_client, client):
    mock_supabase = MagicMock()
    mock_supabase.auth.refresh_session.return_value = auth_response(
        access_token="new_access_token",
        refresh_token="new_refresh_token",
    )
    mock_get_supabase_client.return_value = mock_supabase

    response = await client.post(
        "/auth/refresh",
        json={"refresh_token": "old_refresh_token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] == "new_access_token"
    assert data["refresh_token"] == "new_refresh_token"
    assert data["token_type"] == "bearer"
    mock_supabase.auth.refresh_session.assert_called_once_with("old_refresh_token")


@pytest.mark.asyncio
async def test_login_validation_error_missing_password(client):
    response = await client.post(
        "/auth/login",
        data={"username": "student@ugal.ro"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_validation_error_missing_body(client):
    response = await client.post("/auth/login")
    assert response.status_code == 422
