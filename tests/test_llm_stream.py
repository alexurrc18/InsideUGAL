import pytest
from httpx import AsyncClient
import json
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_ask_chatbot_stream_success(client: AsyncClient, db_session):
    # Mocking the external LLM service call
    with patch("httpx.AsyncClient.stream") as mock_stream:
        # Simulate a successful stream response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.aiter_lines.return_value = [
            "data: {\"content\": \"Hello, \"}",
            "data: {\"content\": \"world!\"}",
            "data: [DONE]"
        ]
        mock_stream.return_value.__aenter__.return_value = mock_response

        response = await client.post(
            "/api/v1/llm/ask/stream",
            json={"question": "Hello", "history": []}
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream"
        
        # Check if stream contents are correct
        response_text = response.text
        assert "data: {\"content\": \"Hello, \", \"cached\": false}" in response_text
        assert "data: {\"content\": \"world!\", \"cached\": false}" in response_text
        assert "data: [DONE]" in response_text

@pytest.mark.asyncio
async def test_ask_chatbot_stream_error(client: AsyncClient, db_session):
    # Mocking the external LLM service call returning an error
    with patch("httpx.AsyncClient.stream") as mock_stream:
        mock_response = AsyncMock()
        mock_response.status_code = 500
        mock_stream.return_value.__aenter__.return_value = mock_response

        response = await client.post(
            "/api/v1/llm/ask/stream",
            json={"question": "Hello", "history": []}
        )

        assert response.status_code == 200
        # Should contain error message instead of normal stream
        assert "data: {\"error\": \"Serviciul LLM a returnat o eroare.\"}" in response.text
