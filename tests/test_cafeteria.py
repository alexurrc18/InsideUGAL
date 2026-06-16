import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_cafeteria_menus_returns_list(client: AsyncClient) -> None:
    response = await client.get("/cafeteria_menus/")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["items"], list)
    assert body["page"] == 1
    assert body["size"] == 20
    assert body["total"] >= len(body["items"])
    assert "total_pages" in body
