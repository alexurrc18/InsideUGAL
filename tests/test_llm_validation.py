"""Unit tests for LLM /ask endpoint request validation (no DB required)."""
import pytest
from pydantic import ValidationError

from app.api.llm import ChatRequest


class TestChatRequestValidation:
    def test_requires_question_field(self):
        """Test that 'question' field is required."""
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest()
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("question",) and e["type"] == "missing" for e in errors)

    def test_rejects_empty_question(self):
        """Test that /ask rejects an empty question string."""
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(question="")
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("question",) and "string_too_short" in e["type"] for e in errors)

    def test_validates_max_length(self):
        """Test that questions over 2000 characters are rejected."""
        long_question = "x" * 2001
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(question=long_question)
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("question",) and "string_too_long" in e["type"] for e in errors)

    def test_accepts_valid_question(self):
        """Test that valid questions are accepted."""
        question = "Care este orarul cantinei?"
        request = ChatRequest(question=question)
        assert request.question == question
        assert request.question == question.strip()