import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import models, schemas
from tests.integration_helpers import create_profile


@pytest.mark.asyncio
async def test_daily_menu_assigns_products_to_weekday(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    admin = await create_profile(db_session, role=schemas.UserRole.HEAD_CANTINA)
    category = models.ProductCategory(name="QA Menu Category")
    product = models.Product(
        name="QA Lunch",
        description="Daily menu product",
        quantity="350g",
        price=20,
        category=category,
    )
    db_session.add_all([category, product])
    await db_session.flush()

    create_response = await client.post(
        "/daily-menus/",
        headers=admin.headers,
        json={"day_of_week": 1, "product_ids": [product.id]},
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["day_of_week"] == 1
    assert [item["id"] for item in created["products"]] == [product.id]

    list_response = await client.get("/daily-menus/?day_of_week=1")

    assert list_response.status_code == 200
    assert any(menu["id"] == created["id"] for menu in list_response.json()["items"])
