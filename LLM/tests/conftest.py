import pytest
from unittest.mock import MagicMock
import sys

@pytest.fixture(autouse=True)
def mock_genai_api(monkeypatch):
    """Mocks the google-genai and openai APIs globally."""
    mock_client = MagicMock()
    
    # Mock for google-genai
    if "google.genai" in sys.modules or "google-genai" in sys.modules:
        monkeypatch.setattr("google.genai.Client", lambda **kwargs: mock_client)
    
    # Mock for openai
    if "openai" in sys.modules:
        monkeypatch.setattr("openai.OpenAI", lambda **kwargs: mock_client)

@pytest.fixture
def sample_announcement():
    return {
        "title": "Test Announcement",
        "content": "This is a test content for the news parser.",
        "date": "2026-06-10"
    }
