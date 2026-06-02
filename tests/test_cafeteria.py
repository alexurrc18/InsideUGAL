import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_cafeteria_menus_returns_list(client: AsyncClient) -> None:
    response = await client.get("/cafeteria_menus/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)
