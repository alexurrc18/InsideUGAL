"""
Testează cerințele 1 și 2:
  1. Contract clar (Pydantic input/output schemas + retry pe output invalid)
  2. Timeout + retry + circuit breaker
"""
import json
import sys
import os
from unittest.mock import patch, MagicMock

import pytest
import pybreaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from schemas import (
    AnswerQuestionInput,
    AnswerQuestionOutput,
    GenerateSummaryInput,
    GenerateSummaryOutput,
    GenerateQuizInput,
    GenerateQuizOutput,
    QuizQuestion,
    QuizVariants,
)

os.environ.setdefault("GEMINI_API_KEY", "test-key")
from functions import llm_functions as llm


# ── Helpers ───────────────────────────────────────────────

VALID_QUIZ_JSON = json.dumps([
    {
        "intrebare": "Ce este fotosinteza?",
        "variante": {"A": "Proces chimic", "B": "Proces fizic", "C": "Proces biologic", "D": "Nimic"},
        "raspuns_corect": "A",
        "explicatii": {"A": "Corect", "B": "Gresit", "C": "Gresit", "D": "Gresit"},
    }
])

VALID_CHUNKS = ["Fotosinteza este un proces.", "Clorofila absoarbe lumina."]


# ════════════════════════════════════════════════════════
# CERINȚA 1 — Contract clar (Pydantic schemas)
# ════════════════════════════════════════════════════════

class TestInputSchemas:
    def test_answer_question_input_valid(self):
        inp = AnswerQuestionInput(question="Ce este fotosinteza?", pdf_id="pdf-123")
        assert inp.question == "Ce este fotosinteza?"
        assert inp.pdf_id == "pdf-123"

    def test_answer_question_input_rejects_short_question(self):
        with pytest.raises(Exception):
            AnswerQuestionInput(question="ab", pdf_id="pdf-123")

    def test_answer_question_input_rejects_empty_pdf_id(self):
        with pytest.raises(Exception):
            AnswerQuestionInput(question="Ce este fotosinteza?", pdf_id="")

    def test_generate_summary_input_valid(self):
        inp = GenerateSummaryInput(pdf_id="pdf-abc")
        assert inp.pdf_id == "pdf-abc"

    def test_generate_quiz_input_rejects_empty_pdf_id(self):
        with pytest.raises(Exception):
            GenerateQuizInput(pdf_id="")


class TestOutputSchemas:
    def test_answer_output_valid(self):
        out = AnswerQuestionOutput(answer="Fotosinteza este procesul prin care...")
        assert len(out.answer) > 0

    def test_answer_output_rejects_empty_string(self):
        with pytest.raises(Exception):
            AnswerQuestionOutput(answer="")

    def test_summary_output_rejects_empty(self):
        with pytest.raises(Exception):
            GenerateSummaryOutput(summary="")

    def test_quiz_output_rejects_empty_list(self):
        with pytest.raises(Exception):
            GenerateQuizOutput(questions=[])

    def test_quiz_question_rejects_invalid_raspuns_corect(self):
        with pytest.raises(Exception):
            QuizQuestion(
                intrebare="Ce este fotosinteza?",
                variante=QuizVariants(A="a", B="b", C="c", D="d"),
                raspuns_corect="E",  # invalid — doar A/B/C/D acceptate
            )

    def test_quiz_question_normalizes_explicatie_string_to_dict(self):
        q = QuizQuestion(
            intrebare="Ce este clorofila?",
            variante=QuizVariants(A="Pigment", B="Proteina", C="Acid", D="Lipid"),
            raspuns_corect="A",
            explicatie="A este corect deoarece clorofila este un pigment.",
        )
        assert q.explicatii is not None
        assert set(q.explicatii.keys()) == {"A", "B", "C", "D"}
        assert q.explicatie is None


class TestOutputValidationWithRetry:
    """LLM returnează ceva invalid → retry o dată → raise."""

    def test_answer_question_retries_once_on_empty_output(self):
        call_count = 0

        def fake_call(prompt):
            nonlocal call_count
            call_count += 1
            return ""  # output invalid — gol

        with patch("functions.llm_functions.query_relevant_chunks", return_value=VALID_CHUNKS), \
             patch("functions.llm_functions._call", side_effect=fake_call):
            with pytest.raises(ValueError, match="invalid după retry"):
                llm.answer_question("Ce este fotosinteza?", "pdf-123")

        assert call_count == 2  # apel original + 1 retry

    def test_generate_quiz_retries_once_on_invalid_json(self):
        call_count = 0

        def fake_call(prompt):
            nonlocal call_count
            call_count += 1
            return "asta nu e json valid {{{{"

        with patch("functions.llm_functions.query_relevant_chunks", return_value=VALID_CHUNKS), \
             patch("functions.llm_functions._call", side_effect=fake_call):
            with pytest.raises(ValueError, match="invalid după retry"):
                llm.generate_quiz("pdf-123")

        assert call_count == 2

    def test_answer_question_succeeds_on_second_attempt(self):
        """Prima încercare întoarce output gol, a doua e validă."""
        call_count = 0

        def fake_call(prompt):
            nonlocal call_count
            call_count += 1
            return "" if call_count == 1 else "Fotosinteza este un proces biochimic."

        with patch("functions.llm_functions.query_relevant_chunks", return_value=VALID_CHUNKS), \
             patch("functions.llm_functions._call", side_effect=fake_call):
            result = llm.answer_question("Ce este fotosinteza?", "pdf-123")

        assert "Fotosinteza" in result
        assert call_count == 2


# ════════════════════════════════════════════════════════
# CERINȚA 2 — Timeout + retry + circuit breaker
# ════════════════════════════════════════════════════════

class TestTimeout:
    def test_timeout_is_30_seconds(self):
        assert llm.TIMEOUT_S == 30

    def test_call_raises_on_timeout(self):
        def slow_call(prompt):
            raise TimeoutError("Gemini nu a răspuns în 30s")

        with patch("functions.llm_functions._raw_gemini", side_effect=slow_call):
            with pytest.raises((TimeoutError, Exception)):
                llm._call("test prompt")


class TestCircuitBreaker:
    def test_circuit_breaker_config(self):
        assert llm._breaker.fail_max == 5
        assert llm._breaker.reset_timeout == 60

    def test_circuit_breaker_opens_after_5_failures(self):
        llm._breaker.close()

        # Patch-uim generate_content (sub breaker), nu _raw_gemini (care e deja decorat)
        with patch.object(llm._client.models, "generate_content", side_effect=OSError("Gemini down")):
            for _ in range(5):
                try:
                    llm._raw_gemini("test")
                except Exception:
                    pass

        assert llm._breaker.current_state == "open"
        llm._breaker.close()


class TestRetryWithBackoff:
    def test_retry_happens_max_2_times_on_timeout(self):
        call_count = 0

        def always_timeout(prompt):
            nonlocal call_count
            call_count += 1
            raise TimeoutError("timeout")

        with patch("functions.llm_functions._raw_gemini", side_effect=always_timeout):
            with pytest.raises(Exception):
                llm._call("test prompt")

        # tenacity: 1 apel original + 2 retry-uri = 3 total
        assert call_count == 3
