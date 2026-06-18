from uuid import uuid4
import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import MagicMock, AsyncMock, patch
from app.models import schemas
from tests.integration_helpers import create_auth_user, create_profile


@pytest.mark.asyncio
async def test_profile_me_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/profiles/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing authentication token."


@pytest.mark.asyncio
async def test_profile_me_returns_authenticated_profile(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    student = await create_profile(db_session, role=schemas.UserRole.STUDENT)

    response = await client.get("/profiles/me", headers=student.headers)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == student.id
    assert body["email"] == student.email
    assert body["role"] == schemas.UserRole.STUDENT.value
    assert body["is_active"] is True


@pytest.mark.asyncio
async def test_admin_can_create_read_update_and_delete_profile(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    from app.models.models import Profile
    from datetime import datetime, timezone
    from unittest.mock import MagicMock, patch
    from uuid import uuid4
    from sqlalchemy import text

    admin = await create_profile(db_session, role=schemas.UserRole.HEAD_ADMIN)
    new_user_id = str(uuid4())
    new_email = f"user-{new_user_id[:12]}@example.com"

    # 1. Ne asigurăm că baza e complet curată pentru acest ID fictiv
    await create_auth_user(db_session, user_id=new_user_id, email=new_email)
    await db_session.execute(text("DELETE FROM public.profiles WHERE id = :id"), {"id": new_user_id})
    await db_session.commit()

    # Payload-ul trimis către API
    create_payload = {
        "id": new_user_id,
        "username": f"user_{new_user_id[:12]}",
        "first_name": "Integration",
        "last_name": "User",
        "email": new_email,
        "role": schemas.UserRole.STUDENT.value,
        "is_active": True,
    }

    # 2. Structurăm mock-ul pentru Supabase Auth
    mock_user_obj = MagicMock()
    mock_user_obj.id = new_user_id

    mock_auth_response = MagicMock()
    mock_auth_response.user = mock_user_obj

    # 3. Facem patch pe clientul Supabase și trimitem request-ul POST
    with patch("app.api.profiles.supabase") as mock_supabase:
        mock_supabase.auth.admin.create_user.return_value = mock_auth_response

        # Ruta va apela repo.create() și va genera singură rândul în DB
        create_response = await client.post("/profiles/", json=create_payload, headers=admin.headers)

    # 4. Aserțiuni
    print("Eroare primită de la API:", create_response.json())
    assert create_response.status_code == 201
    
    # Optional: Verificăm că ruta a returnat datele corecte
    response_data = create_response.json()
    assert response_data["id"] == new_user_id
    assert response_data["email"] == new_email

@pytest.mark.asyncio
async def test_student_cannot_use_admin_profile_routes(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    student = await create_profile(db_session, role=schemas.UserRole.STUDENT)

    response = await client.get("/profiles/", headers=student.headers)

    assert response.status_code == 403
    assert response.json()["detail"] == "Nu ai permisiuni suficiente."
