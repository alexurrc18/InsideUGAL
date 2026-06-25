import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import schemas
from tests.integration_helpers import create_faculty, create_profile


@pytest.mark.asyncio
async def test_announcements_list_requires_auth_and_missing_detail_is_public(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    student = await create_profile(db_session, role=schemas.UserRole.STUDENT)

    unauthenticated_list_response = await client.get("/announcements/")
    list_response = await client.get("/announcements/", headers=student.headers)
    missing_response = await client.get("/announcements/999999")

    assert unauthenticated_list_response.status_code == 401
    assert unauthenticated_list_response.json()["detail"] == "Missing authentication token."
    assert list_response.status_code == 200
    body = list_response.json()
    assert isinstance(body["items"], list)
    assert body["page"] == 1
    assert body["size"] == 20
    assert body["total"] >= len(body["items"])
    assert "total_pages" in body
    assert missing_response.status_code == 404
    assert missing_response.json()["detail"] == "Announcement not found."


@pytest.mark.asyncio
async def test_create_announcement_requires_authenticated_author(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    student = await create_profile(db_session, role=schemas.UserRole.STUDENT)
    payload = {"type": schemas.PostType.NOUTATE.value, "title": "News", "content": "Public content"}

    unauthenticated_response = await client.post("/announcements/", json=payload)
    forbidden_response = await client.post("/announcements/", json=payload, headers=student.headers)

    assert unauthenticated_response.status_code == 401
    assert unauthenticated_response.json()["detail"] == "Missing authentication token."
    assert forbidden_response.status_code == 403
    assert forbidden_response.json()["detail"] == "Nu ai permisiuni suficiente."


@pytest.mark.asyncio
async def test_author_can_create_read_filter_update_and_delete_announcement(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    faculty = await create_faculty(db_session)
    author = await create_profile(
        db_session,
        role=schemas.UserRole.PROFESOR,
        faculty_id=faculty.id,
    )

    create_payload = {
        "type": schemas.PostType.EVENIMENT.value,
        "title": "QA Workshop",
        "content": "A practical workshop for integration testing.",
        "faculty_id": faculty.id,
        "location_name": "Lab QA",
        "start_date": "2031-03-10T10:00:00Z",
        "end_date": "2031-03-10T12:00:00Z",
    }
    create_response = await client.post("/announcements/", json=create_payload, headers=author.headers)

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["created_by"] == author.id
    assert created["type"] == schemas.PostType.EVENIMENT.value
    assert created["faculty_id"] == faculty.id
    assert created["location_name"] == "Lab QA"
    assert created["start_date"].startswith("2031-03-10T10:00:00")

    announcement_id = created["id"]
    read_response = await client.get(f"/announcements/{announcement_id}")
    assert read_response.status_code == 200
    assert read_response.json()["id"] == announcement_id

    filter_response = await client.get(
        f"/announcements/?announcement_type={schemas.PostType.EVENIMENT.value}&faculty_id={faculty.id}",
        headers=author.headers,
    )
    assert filter_response.status_code == 200
    assert any(announcement["id"] == announcement_id for announcement in filter_response.json()["items"])

    invalid_update_response = await client.patch(
        f"/announcements/{announcement_id}",
        json={"end_date": "2031-03-09T12:00:00Z"},
        headers=author.headers,
    )
    assert invalid_update_response.status_code == 422
    assert invalid_update_response.json()["detail"] == "end_date must be after start_date."

    update_response = await client.patch(
        f"/announcements/{announcement_id}",
        json={
            "type": schemas.PostType.NOUTATE.value,
            "title": "Updated QA News",
            "content": "The event has been converted into a news post.",
        },
        headers=author.headers,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["type"] == schemas.PostType.NOUTATE.value
    assert updated["title"] == "Updated QA News"
    assert updated["location_name"] is None
    assert updated["start_date"] is None
    assert updated["end_date"] is None

    delete_response = await client.delete(f"/announcements/{announcement_id}", headers=author.headers)
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    missing_response = await client.get(f"/announcements/{announcement_id}")
    assert missing_response.status_code == 404
    assert missing_response.json()["detail"] == "Announcement not found."


@pytest.mark.asyncio
async def test_student_representative_cannot_manage_another_author_announcement(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    professor = await create_profile(db_session, role=schemas.UserRole.PROFESOR)
    representative = await create_profile(db_session, role=schemas.UserRole.STUDENT_RESPONSABIL)

    create_response = await client.post(
        "/announcements/",
        json={
            "type": schemas.PostType.NOUTATE.value,
            "title": "Professor news",
            "content": "Owned by a professor.",
        },
        headers=professor.headers,
    )
    assert create_response.status_code == 201
    announcement_id = create_response.json()["id"]

    patch_response = await client.patch(
        f"/announcements/{announcement_id}",
        json={"title": "Representative update"},
        headers=representative.headers,
    )
    delete_response = await client.delete(f"/announcements/{announcement_id}", headers=representative.headers)

    assert patch_response.status_code == 403
    assert patch_response.json()["detail"] == "Student representatives can manage only their own announcements."
    assert delete_response.status_code == 403
    assert delete_response.json()["detail"] == "Student representatives can manage only their own announcements."


@pytest.mark.asyncio
async def test_student_feed_contains_general_and_own_faculty_announcements_only(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    own_faculty = await create_faculty(db_session, name="Own Faculty")
    other_faculty = await create_faculty(db_session, name="Other Faculty")
    author = await create_profile(db_session, role=schemas.UserRole.HEAD_ADMIN)
    student = await create_profile(
        db_session,
        role=schemas.UserRole.STUDENT,
        faculty_id=own_faculty.id,
    )

    general_response = await client.post(
        "/announcements/",
        json={
            "type": schemas.PostType.NOUTATE.value,
            "title": "General news",
            "content": "Visible to every student.",
        },
        headers=author.headers,
    )
    own_faculty_response = await client.post(
        "/announcements/",
        json={
            "type": schemas.PostType.NOUTATE.value,
            "title": "Own faculty news",
            "content": "Visible to this student's faculty.",
            "faculty_id": own_faculty.id,
        },
        headers=author.headers,
    )
    other_faculty_response = await client.post(
        "/announcements/",
        json={
            "type": schemas.PostType.NOUTATE.value,
            "title": "Other faculty news",
            "content": "Not visible to this student.",
            "faculty_id": other_faculty.id,
        },
        headers=author.headers,
    )

    assert general_response.status_code == 201
    assert own_faculty_response.status_code == 201
    assert other_faculty_response.status_code == 201

    response = await client.get("/announcements/", headers=student.headers)

    assert response.status_code == 200
    returned_ids = {announcement["id"] for announcement in response.json()["items"]}
    assert general_response.json()["id"] in returned_ids
    assert own_faculty_response.json()["id"] in returned_ids
    assert other_faculty_response.json()["id"] not in returned_ids


@pytest.mark.asyncio
async def test_head_facultati_feed_contains_general_and_own_faculty_announcements_only(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    own_faculty = await create_faculty(db_session, name="Head Own Faculty")
    other_faculty = await create_faculty(db_session, name="Head Other Faculty")
    author = await create_profile(db_session, role=schemas.UserRole.HEAD_ADMIN)
    head_facultati = await create_profile(
        db_session,
        role=schemas.UserRole.HEAD_FACULTATI,
        faculty_id=own_faculty.id,
    )

    general_response = await client.post(
        "/announcements/",
        json={
            "type": schemas.PostType.NOUTATE.value,
            "title": "General head news",
            "content": "Visible to every faculty head.",
        },
        headers=author.headers,
    )
    own_event_response = await client.post(
        "/announcements/",
        json={
            "type": schemas.PostType.EVENIMENT.value,
            "title": "Own faculty event",
            "content": "Visible to this faculty head.",
            "faculty_id": own_faculty.id,
            "start_date": "2026-10-10T09:00:00Z",
        },
        headers=author.headers,
    )
    other_event_response = await client.post(
        "/announcements/",
        json={
            "type": schemas.PostType.EVENIMENT.value,
            "title": "Other faculty event",
            "content": "Hidden from this faculty head.",
            "faculty_id": other_faculty.id,
            "start_date": "2026-10-11T09:00:00Z",
        },
        headers=author.headers,
    )
    assert general_response.status_code == 201
    assert own_event_response.status_code == 201
    assert other_event_response.status_code == 201

    response = await client.get("/announcements/", headers=head_facultati.headers)

    assert response.status_code == 200
    returned_ids = {announcement["id"] for announcement in response.json()["items"]}
    assert general_response.json()["id"] in returned_ids
    assert own_event_response.json()["id"] in returned_ids
    assert other_event_response.json()["id"] not in returned_ids


@pytest.mark.asyncio
async def test_create_event_announcement_requires_start_date(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    author = await create_profile(db_session, role=schemas.UserRole.HEAD_ADMIN)

    response = await client.post(
        "/announcements/",
        json={
            "type": schemas.PostType.EVENIMENT.value,
            "title": "Invalid event",
            "content": "An event without a start date is invalid.",
        },
        headers=author.headers,
    )

    assert response.status_code == 422
    assert "start_date is required for EVENIMENT announcements." in str(response.json()["detail"])


@pytest.mark.asyncio
async def test_create_announcement_rejects_missing_faculty_reference(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    author = await create_profile(db_session, role=schemas.UserRole.PROFESOR)

    response = await client.post(
        "/announcements/",
        json={
            "type": schemas.PostType.NOUTATE.value,
            "title": "Invalid faculty",
            "content": "This should fail because the faculty does not exist.",
            "faculty_id": 999999,
        },
        headers=author.headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Faculty not found."
