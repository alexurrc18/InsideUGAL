import asyncio
import json
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db.database import get_db
from app.api.auth_deps import get_current_profile
from app.models.models import Profile

# Fake DB session with minimal API used by llm_stream
class FakeSession:
    async def execute(self, *args, **kwargs):
        class R:
            def scalar_one_or_none(self):
                return None
        return R()

    def add(self, *args, **kwargs):
        pass

    async def commit(self):
        pass

    async def rollback(self):
        pass

    async def close(self):
        pass

async def main():
    # Override dependencies
    async def fake_get_db():
        yield FakeSession()

    async def fake_get_current_profile():
        # Minimal Profile-like object
        p = Profile()
        p.id = "test-user"
        return p

    app.dependency_overrides[get_db] = fake_get_db
    app.dependency_overrides[get_current_profile] = fake_get_current_profile

    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mock the external LLM SSE stream
        with patch("httpx.AsyncClient.stream") as mock_stream:
            mock_response = AsyncMock()
            mock_response.status_code = 200

            async def _aiter_lines():
                yield 'data: {"content": "Buna, "}'
                yield 'data: {"content": "lume!"}'
                yield 'data: [DONE]'

            mock_response.aiter_lines = _aiter_lines
            mock_stream.return_value.__aenter__.return_value = mock_response

            resp = await client.post("/api/v1/llm/ask/stream", json={"question": "Care este meniul zilei?", "history": []})
            print("Status:", resp.status_code)
            print("Content-Type:", resp.headers.get("content-type"))
            text = resp.text
            print("--- Stream body start ---")
            print(text)
            print("--- Stream body end ---")

if __name__ == '__main__':
    asyncio.run(main())
