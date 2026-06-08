import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx
from app.main import app

# --- MOCK-UIREA BAZEI DE DATE REPARATĂ PENTRU ASYNC CONTEXT MANAGER ---
@pytest.fixture(autouse=True, scope="module")
def mock_sqlalchemy_connect():
    # Creăm un mock specializat care suportă "async with"
    mock_connection = AsyncMock()
    mock_context_manager = MagicMock()
    mock_context_manager.__aenter__.return_value = mock_connection
    
    with patch("sqlalchemy.ext.asyncio.engine.AsyncEngine.connect", return_value=mock_context_manager) as mock:
        yield mock

# Căutăm automat funcția get_db direct în cheile dependency_overrides 
# sau din contextele FastAPI pentru a evita erorile de import
def get_fastapi_db_dependency():
    for key in app.dependency_overrides.keys():
        if getattr(key, '__name__', '') == 'get_db':
            return key
    
    for route in app.routes:
        if hasattr(route, "dependant"):
            for sub_dependant in route.dependant.dependencies:
                if sub_dependant.call.__name__ == 'get_db':
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

# --- PĂSTREAZĂ TOATE CELE 4 FUNCȚII DE TEST SUB ACEASTĂ LINIE ---

# --- TESTELE PROPRIU-ZISE ---

@pytest.mark.asyncio
@patch("app.api.auth.httpx.AsyncClient")
async def test_login_success(mock_client_class, client):
    """Scenariul 1: Succes (200) - Credențiale valide"""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "access_token": "mocked_valid_jwt_token",
        "token_type": "bearer"
    }
    
    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    mock_client_class.return_value.__aenter__.return_value = mock_client_instance

    response = await client.post(
        "/auth/login", 
        data={"username": "student@student.graphql.ro", "password": "ParolaUgal123!"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] == "mocked_valid_jwt_token"
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
@patch("app.api.auth.httpx.AsyncClient")
async def test_login_unauthorized_wrong_credentials(mock_client_class, client):
    """Scenariul 2: Unauthorized (401) - Parolă greșită sau email inexistent"""
    mock_response = httpx.Response(401, text="Invalid login credentials")
    
    mock_client_instance = AsyncMock()
    mock_client_instance.post.side_effect = httpx.HTTPStatusError(
        message="Unauthorized", 
        request=httpx.Request("POST", "http://supabase"), 
        response=mock_response
    )
    mock_client_class.return_value.__aenter__.return_value = mock_client_instance

    response = await client.post(
        "/auth/login", 
        data={"username": "gresit@ugal.ro", "password": "ParolaGresita"}
    )
    
    assert response.status_code == 401
    assert "Supabase authentication failed" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_validation_error_missing_password(client):
    """Scenariul 3: Validation Error (422) - Lipsește parola din formular"""
    response = await client.post(
        "/auth/login", 
        data={"username": "student@ugal.ro"}
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_validation_error_missing_body(client):
    """Scenariul 3: Validation Error (422) - Body complet lipsă"""
    response = await client.post("/auth/login")
    assert response.status_code == 422