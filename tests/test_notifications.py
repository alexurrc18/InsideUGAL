import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import models, schemas
from tests.integration_helpers import create_profile, create_faculty

@pytest.mark.asyncio
async def test_notification_permissions(client: AsyncClient, db_session: AsyncSession) -> None:
    # Create test faculties
    faculty1 = await create_faculty(db_session, name="Faculty One")
    faculty2 = await create_faculty(db_session, name="Faculty Two")
    await db_session.commit()

    # Create users with different roles
    student = await create_profile(db_session, role=schemas.UserRole.STUDENT, faculty_id=faculty1.id)
    head_cantina = await create_profile(db_session, role=schemas.UserRole.HEAD_CANTINA, faculty_id=faculty1.id)
    student_rep = await create_profile(db_session, role=schemas.UserRole.STUDENT_RESPONSABIL, faculty_id=faculty1.id)
    profesor = await create_profile(db_session, role=schemas.UserRole.PROFESOR, faculty_id=faculty1.id)
    head_facultati = await create_profile(db_session, role=schemas.UserRole.HEAD_FACULTATI, faculty_id=faculty1.id)
    head_admin = await create_profile(db_session, role=schemas.UserRole.HEAD_ADMIN)
    await db_session.commit()

    notification_payload = {
        "title": "Test Title",
        "body": "Test Body",
        "action": "https://example.com",
        "faculty_id": None
    }

    # 1. Student cannot send notifications
    res = await client.post("/notifications/send", json=notification_payload, headers=student.headers)
    assert res.status_code == 403

    # 2. Head Cantina cannot send notifications
    res = await client.post("/notifications/send", json=notification_payload, headers=head_cantina.headers)
    assert res.status_code == 403

    # 3. Student Responsabil can send notifications targeting None
    res = await client.post("/notifications/send", json=notification_payload, headers=student_rep.headers)
    assert res.status_code == 201
    assert res.json()["faculty_id"] is None

    # 4. Profesor can send notifications targeting faculty2
    res = await client.post("/notifications/send", json={**notification_payload, "faculty_id": faculty2.id}, headers=profesor.headers)
    assert res.status_code == 201
    assert res.json()["faculty_id"] == faculty2.id

    # 5. Head Facultati can send notifications targeting None
    res = await client.post("/notifications/send", json=notification_payload, headers=head_facultati.headers)
    assert res.status_code == 201
    assert res.json()["faculty_id"] is None

    # 6. Head Admin can send notifications targeting any faculty or None
    res = await client.post("/notifications/send", json={**notification_payload, "faculty_id": faculty2.id}, headers=head_admin.headers)
    assert res.status_code == 201
    assert res.json()["faculty_id"] == faculty2.id

    # Head Admin targeting None (all faculties)
    res = await client.post("/notifications/send", json=notification_payload, headers=head_admin.headers)
    assert res.status_code == 201
    assert res.json()["faculty_id"] is None
