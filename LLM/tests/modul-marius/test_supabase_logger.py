import sys
import os
import time
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import supabase_logger


class TestSupabaseLogger:

    def test_log_trimite_post_request(self):
        """Verifică că se face un POST la Supabase când credențialele sunt prezente."""
        with patch.object(supabase_logger, "SUPABASE_URL", "http://test.example.com"), \
             patch.object(supabase_logger, "SUPABASE_KEY", "test-key"), \
             patch("supabase_logger.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=201)

            supabase_logger.log_llm_call(
                function_name="answer_question",
                model="gemini-2.5-flash",
                prompt_tokens=100,
                response_tokens=50,
                total_tokens=150,
                cached=False,
                duration_ms=1500,
            )
            time.sleep(0.15)

            mock_post.assert_called_once()

    def test_log_url_contine_llm_calls(self):
        """Verifică că URL-ul apelului conține tabelul 'llm_calls'."""
        with patch.object(supabase_logger, "SUPABASE_URL", "http://test.example.com"), \
             patch.object(supabase_logger, "SUPABASE_KEY", "test-key"), \
             patch("supabase_logger.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=201)

            supabase_logger.log_llm_call("fn", "model", 0, 0, 0, False)
            time.sleep(0.15)

            url_called = mock_post.call_args[0][0]
            assert "llm_calls" in url_called

    def test_log_payload_corect(self):
        """Verifică că payload-ul JSON trimis conține toate câmpurile necesare."""
        with patch.object(supabase_logger, "SUPABASE_URL", "http://test.example.com"), \
             patch.object(supabase_logger, "SUPABASE_KEY", "test-key"), \
             patch("supabase_logger.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=201)

            supabase_logger.log_llm_call(
                function_name="generate_quiz",
                model="gemini-2.5-flash",
                prompt_tokens=200,
                response_tokens=100,
                total_tokens=300,
                cached=True,
                duration_ms=None,
            )
            time.sleep(0.15)

            payload = mock_post.call_args[1]["json"]
            assert payload["function_name"] == "generate_quiz"
            assert payload["model"] == "gemini-2.5-flash"
            assert payload["prompt_tokens"] == 200
            assert payload["response_tokens"] == 100
            assert payload["total_tokens"] == 300
            assert payload["cached"] is True
            assert payload["duration_ms"] is None

    def test_log_nu_trimite_fara_url(self):
        """Verifică că nu se face niciun request dacă SUPABASE_URL e gol."""
        with patch.object(supabase_logger, "SUPABASE_URL", ""), \
             patch.object(supabase_logger, "SUPABASE_KEY", "test-key"), \
             patch("supabase_logger.requests.post") as mock_post:

            supabase_logger.log_llm_call("fn", "model", 0, 0, 0, False)
            time.sleep(0.15)

            mock_post.assert_not_called()

    def test_log_nu_trimite_fara_cheie(self):
        """Verifică că nu se face niciun request dacă SUPABASE_SERVICE_KEY e gol."""
        with patch.object(supabase_logger, "SUPABASE_URL", "http://test.example.com"), \
             patch.object(supabase_logger, "SUPABASE_KEY", ""), \
             patch("supabase_logger.requests.post") as mock_post:

            supabase_logger.log_llm_call("fn", "model", 0, 0, 0, False)
            time.sleep(0.15)

            mock_post.assert_not_called()

    def test_log_nu_ridica_eroare_la_network_failure(self):
        """Verifică că o eroare de rețea nu blochează fluxul principal."""
        with patch.object(supabase_logger, "SUPABASE_URL", "http://test.example.com"), \
             patch.object(supabase_logger, "SUPABASE_KEY", "test-key"), \
             patch("supabase_logger.requests.post", side_effect=Exception("timeout")):

            supabase_logger.log_llm_call("fn", "model", 0, 0, 0, False)
            time.sleep(0.15)
            # Nicio excepție nu trebuie propagată

    def test_log_headers_contin_authorization(self):
        """Verifică că headerele includ autorizarea corectă."""
        with patch.object(supabase_logger, "SUPABASE_URL", "http://test.example.com"), \
             patch.object(supabase_logger, "SUPABASE_KEY", "mykey123"), \
             patch("supabase_logger.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=201)

            supabase_logger.log_llm_call("fn", "model", 0, 0, 0, False)
            time.sleep(0.15)

            headers = mock_post.call_args[1]["headers"]
            assert headers["apikey"] == "mykey123"
            assert "Bearer mykey123" in headers["Authorization"]
