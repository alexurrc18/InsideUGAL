from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import schemas
from tests.integration_helpers import create_profile


@pytest.mark.asyncio
async def test_daily_menu_creates_calendar_item_and_lists_today(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    admin = await create_profile(db_session, role=schemas.UserRole.HEAD_CANTINA)
    today = date.today().isoformat()

    create_response = await client.post(
        "/daily-menus/",
        headers=admin.headers,
        json={
            "name": "QA Lunch",
            "price": "20.00",
            "description": "Daily menu item",
            "day": today,
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == "QA Lunch"
    assert created["day"] == today

    list_response = await client.get(f"/daily-menus/?day={today}")

    assert list_response.status_code == 200
    assert any(menu["id"] == created["id"] for menu in list_response.json()["items"])

    today_response = await client.get("/menu/today")

    assert today_response.status_code == 200
    assert any(menu["id"] == created["id"] for menu in today_response.json())
