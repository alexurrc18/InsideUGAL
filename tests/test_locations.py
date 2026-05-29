import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_locations_returns_list(client: AsyncClient) -> None:
    response = await client.get("/locations/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)
