"""
Testează cerința 3: Cache cu cheie deterministă (hash prompt + model + temperature, TTL).
"""
import os
import sys
import sqlite3
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import cache as c

os.environ.setdefault("GEMINI_API_KEY", "test-key")
from functions import llm_functions as llm


@pytest.fixture(autouse=True)
def clean_cache():
    """Pornim fiecare test cu cache gol."""
    with c._conn() as con:
        con.execute("DELETE FROM llm_cache")
    yield


# ── Chei deterministe ─────────────────────────────────────

class TestCacheKey:
    def test_same_inputs_same_key(self):
        k1 = c.make_key("prompt", "gemini-2.5-flash", 0.7)
        k2 = c.make_key("prompt", "gemini-2.5-flash", 0.7)
        assert k1 == k2

    def test_different_prompt_different_key(self):
        k1 = c.make_key("prompt A", "gemini-2.5-flash", 0.7)
        k2 = c.make_key("prompt B", "gemini-2.5-flash", 0.7)
        assert k1 != k2

    def test_different_model_different_key(self):
        k1 = c.make_key("prompt", "gemini-2.5-flash", 0.7)
        k2 = c.make_key("prompt", "gemini-1.5-pro", 0.7)
        assert k1 != k2

    def test_different_temperature_different_key(self):
        k1 = c.make_key("prompt", "gemini-2.5-flash", 0.7)
        k2 = c.make_key("prompt", "gemini-2.5-flash", 0.9)
        assert k1 != k2

    def test_key_is_sha256(self):
        key = c.make_key("test", "model", 0.5)
        assert len(key) == 64  # SHA256 hex = 64 caractere


# ── Set / Get / Invalidate ────────────────────────────────

class TestCacheOperations:
    def test_cache_miss_returns_none(self):
        key = c.make_key("inexistent", "model", 0.7)
        assert c.get(key) is None

    def test_set_then_get_returns_value(self):
        key = c.make_key("prompt", "gemini-2.5-flash", 0.7)
        c.set(key, "raspuns LLM", "gemini-2.5-flash")
        assert c.get(key) == "raspuns LLM"

    def test_invalidate_removes_entry(self):
        key = c.make_key("prompt", "gemini-2.5-flash", 0.7)
        c.set(key, "raspuns", "gemini-2.5-flash")
        c.invalidate(key)
        assert c.get(key) is None

    def test_set_overwrites_existing(self):
        key = c.make_key("prompt", "gemini-2.5-flash", 0.7)
        c.set(key, "primul raspuns", "gemini-2.5-flash")
        c.set(key, "al doilea raspuns", "gemini-2.5-flash")
        assert c.get(key) == "al doilea raspuns"


# ── TTL ───────────────────────────────────────────────────

class TestCacheTTL:
    def test_valid_entry_returned_before_expiry(self):
        key = c.make_key("prompt", "gemini-2.5-flash", 0.7)
        c.set(key, "raspuns", "gemini-2.5-flash", ttl_hours=24)
        assert c.get(key) == "raspuns"

    def test_expired_entry_returns_none(self):
        key = c.make_key("prompt ttl", "gemini-2.5-flash", 0.7)
        c.set(key, "raspuns", "gemini-2.5-flash", ttl_hours=1)
        # Forțăm expirarea
        with sqlite3.connect(c.DB_PATH) as con:
            con.execute(
                "UPDATE llm_cache SET expires_at = ? WHERE cache_key = ?",
                ((datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(), key),
            )
        assert c.get(key) is None

    def test_clear_expired_removes_only_expired(self):
        k_valid = c.make_key("valid", "gemini-2.5-flash", 0.7)
        k_expired = c.make_key("expired", "gemini-2.5-flash", 0.7)
        c.set(k_valid, "ok", "gemini-2.5-flash", ttl_hours=24)
        c.set(k_expired, "vechi", "gemini-2.5-flash", ttl_hours=1)
        with sqlite3.connect(c.DB_PATH) as con:
            con.execute(
                "UPDATE llm_cache SET expires_at = ? WHERE cache_key = ?",
                ((datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(), k_expired),
            )
        removed = c.clear_expired()
        assert removed == 1
        assert c.get(k_valid) == "ok"
        assert c.get(k_expired) is None


# ── Integrare cu _call() ──────────────────────────────────

class TestCacheIntegration:
    def test_second_call_hits_cache_not_gemini(self):
        """Al doilea apel identic nu trebuie să ajungă la Gemini."""
        call_count = 0

        def fake_gemini(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            resp = type("R", (), {"text": "raspuns de la Gemini"})()
            return resp

        with patch.object(llm._client.models, "generate_content", side_effect=fake_gemini):
            r1 = llm._call("acelasi prompt")
            r2 = llm._call("acelasi prompt")

        assert r1 == r2 == "raspuns de la Gemini"
        assert call_count == 1  # Gemini apelat o singură dată

    def test_different_prompts_both_hit_gemini(self):
        call_count = 0

        def fake_gemini(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            resp = type("R", (), {"text": f"raspuns {call_count}"})()
            return resp

        with patch.object(llm._client.models, "generate_content", side_effect=fake_gemini):
            llm._call("prompt A")
            llm._call("prompt B")

        assert call_count == 2
