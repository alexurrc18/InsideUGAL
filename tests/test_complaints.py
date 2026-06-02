import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import schemas
from tests.integration_helpers import create_faculty, create_location, create_profile


@pytest.mark.asyncio
async def test_complaint_routes_require_authentication(client: AsyncClient) -> None:
    response = await client.get("/complaints/")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing authentication token."


@pytest.mark.asyncio
async def test_student_can_create_read_update_and_delete_own_complaint(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    student = await create_profile(db_session, role=schemas.UserRole.STUDENT)
    faculty = await create_faculty(db_session)
    location = await create_location(db_session, faculty_id=faculty.id)

    create_payload = {
        "location_id": location.id,
        "title": "Broken projector",
        "description": "The projector in the QA room does not turn on.",
        "image_url": "https://example.com/projector.jpg",
    }
    create_response = await client.post("/complaints/", json=create_payload, headers=student.headers)

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["user_id"] == student.id
    assert created["location_id"] == location.id
    assert created["title"] == create_payload["title"]
    assert created["status"] == schemas.ComplaintStatus.in_asteptare.value

    complaint_id = created["id"]
    list_response = await client.get("/complaints/", headers=student.headers)
    assert list_response.status_code == 200
    assert any(complaint["id"] == complaint_id for complaint in list_response.json())

    read_response = await client.get(f"/complaints/{complaint_id}", headers=student.headers)
    assert read_response.status_code == 200
    assert read_response.json()["id"] == complaint_id

    update_response = await client.patch(
        f"/complaints/{complaint_id}",
        json={"title": "Updated projector issue", "description": "Still not working."},
        headers=student.headers,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "Updated projector issue"
    assert updated["description"] == "Still not working."

    forbidden_status_response = await client.patch(
        f"/complaints/{complaint_id}",
        json={"status": schemas.ComplaintStatus.finalizat.value},
        headers=student.headers,
    )
    assert forbidden_status_response.status_code == 403
    assert forbidden_status_response.json()["detail"] == "Only staff can change complaint status."

    delete_response = await client.delete(f"/complaints/{complaint_id}", headers=student.headers)
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    missing_response = await client.get(f"/complaints/{complaint_id}", headers=student.headers)
    assert missing_response.status_code == 404
    assert missing_response.json()["detail"] == "Complaint not found."


@pytest.mark.asyncio
async def test_student_sees_only_own_complaints_and_cannot_read_other_student_complaint(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    owner = await create_profile(db_session, role=schemas.UserRole.STUDENT)
    other_student = await create_profile(db_session, role=schemas.UserRole.STUDENT)

    owner_response = await client.post(
        "/complaints/",
        json={"title": "Owner issue", "description": "Visible to owner only."},
        headers=owner.headers,
    )
    other_response = await client.post(
        "/complaints/",
        json={"title": "Other issue", "description": "Should not be visible to owner."},
        headers=other_student.headers,
    )
    assert owner_response.status_code == 201
    assert other_response.status_code == 201

    owner_complaint_id = owner_response.json()["id"]
    other_complaint_id = other_response.json()["id"]

    list_response = await client.get("/complaints/", headers=owner.headers)
    assert list_response.status_code == 200
    complaint_ids = {complaint["id"] for complaint in list_response.json()}
    assert owner_complaint_id in complaint_ids
    assert other_complaint_id not in complaint_ids

    forbidden_response = await client.get(f"/complaints/{other_complaint_id}", headers=owner.headers)
    assert forbidden_response.status_code == 403
    assert forbidden_response.json()["detail"] == "Nu ai permisiuni suficiente."


@pytest.mark.asyncio
async def test_staff_can_filter_and_update_complaint_status(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    student = await create_profile(db_session, role=schemas.UserRole.STUDENT)
    staff = await create_profile(db_session, role=schemas.UserRole.HEAD_FACULTATI)
    location = await create_location(db_session)

    create_response = await client.post(
        "/complaints/",
        json={
            "location_id": location.id,
            "title": "Heating issue",
            "description": "The room is cold during lectures.",
        },
        headers=student.headers,
    )
    assert create_response.status_code == 201
    complaint_id = create_response.json()["id"]

    status_response = await client.patch(
        f"/complaints/{complaint_id}",
        json={"status": schemas.ComplaintStatus.in_lucru.value},
        headers=staff.headers,
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == schemas.ComplaintStatus.in_lucru.value

    filter_response = await client.get(
        f"/complaints/?complaint_status={schemas.ComplaintStatus.in_lucru.value}&location_id={location.id}",
        headers=staff.headers,
    )
    assert filter_response.status_code == 200
    filtered_ids = {complaint["id"] for complaint in filter_response.json()}
    assert complaint_id in filtered_ids


@pytest.mark.asyncio
async def test_create_complaint_rejects_missing_location_reference(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    student = await create_profile(db_session, role=schemas.UserRole.STUDENT)

    response = await client.post(
        "/complaints/",
        json={
            "location_id": 999999,
            "title": "Invalid location",
            "description": "This should fail because the location does not exist.",
        },
        headers=student.headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Location not found."
