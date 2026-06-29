import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import models, schemas
from tests.integration_helpers import create_profile


@pytest.mark.asyncio
async def test_list_locations_returns_list(client: AsyncClient) -> None:
    response = await client.get("/locations/")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["items"], list)
    assert body["page"] == 1
    assert body["size"] == 20
    assert body["total"] >= len(body["items"])
    assert "total_pages" in body


@pytest.mark.asyncio
async def test_location_coordinates_are_serialized_as_json(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    admin = await create_profile(db_session, role=schemas.UserRole.HEAD_ADMIN)

    create_response = await client.post(
        "/locations/",
        headers=admin.headers,
        json={
            "name": "QA Map Building",
            "faculty_ids": [],
            "coordinates": {
                "latitude": 45.4361,
                "longitude": 28.0552,
            },
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["coordinates"] == {
        "latitude": 45.4361,
        "longitude": 28.0552,
    }

    read_response = await client.get(f"/locations/{created['id']}")

    assert read_response.status_code == 200
    body = read_response.json()
    assert body["coordinates"] == {
        "latitude": 45.4361,
        "longitude": 28.0552,
    }


@pytest.mark.asyncio
async def test_location_response_includes_facility_image_url(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    facility = models.Facility(
        name="QA Facility With Image",
        description="Facility image source",
        image_url="https://example.com/facility.jpg",
    )
    db_session.add(facility)
    await db_session.flush()

    location = models.Location(
        name="QA Facility Location",
        facility_id=facility.id,
        coordinates=None,
    )
    db_session.add(location)
    await db_session.flush()
    await db_session.refresh(location)

    response = await client.get(f"/locations/{location.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["facility_id"] == facility.id
    assert body["image_url"] == "https://example.com/facility.jpg"
