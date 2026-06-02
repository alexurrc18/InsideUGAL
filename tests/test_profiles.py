from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

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
    admin = await create_profile(db_session, role=schemas.UserRole.HEAD_ADMIN)
    new_user_id = str(uuid4())
    new_email = f"{new_user_id}@example.com"
    await create_auth_user(db_session, user_id=new_user_id, email=new_email)

    create_payload = {
        "id": new_user_id,
        "username": f"profile-{new_user_id[:8]}",
        "first_name": "Integration",
        "last_name": "Student",
        "email": new_email,
        "role": schemas.UserRole.STUDENT.value,
        "is_active": True,
    }
    create_response = await client.post("/profiles/", json=create_payload, headers=admin.headers)

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["id"] == new_user_id
    assert created["email"] == new_email
    assert created["role"] == schemas.UserRole.STUDENT.value

    list_response = await client.get("/profiles/", headers=admin.headers)
    assert list_response.status_code == 200
    assert any(profile["id"] == new_user_id for profile in list_response.json())

    read_response = await client.get(f"/profiles/{new_user_id}", headers=admin.headers)
    assert read_response.status_code == 200
    assert read_response.json()["id"] == new_user_id

    update_response = await client.patch(
        f"/profiles/{new_user_id}",
        json={"first_name": "Updated", "role": schemas.UserRole.PROFESOR.value},
        headers=admin.headers,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["first_name"] == "Updated"
    assert updated["role"] == schemas.UserRole.PROFESOR.value

    delete_response = await client.delete(f"/profiles/{new_user_id}", headers=admin.headers)
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    missing_response = await client.get(f"/profiles/{new_user_id}", headers=admin.headers)
    assert missing_response.status_code == 404
    assert missing_response.json()["detail"] == "Profile not found."


@pytest.mark.asyncio
async def test_student_cannot_use_admin_profile_routes(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    student = await create_profile(db_session, role=schemas.UserRole.STUDENT)

    response = await client.get("/profiles/", headers=student.headers)

    assert response.status_code == 403
    assert response.json()["detail"] == "Nu ai permisiuni suficiente."
