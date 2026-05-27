import os
import threading
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def log_llm_call(
    function_name: str,
    model: str,
    prompt_tokens: int,
    response_tokens: int,
    total_tokens: int,
    cached: bool,
    duration_ms: Optional[int] = None,
) -> None:
    """Loghează un apel LLM în Supabase. Fire-and-forget, nu blochează fluxul principal."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return

    def _send() -> None:
        try:
            requests.post(
                f"{SUPABASE_URL}/rest/v1/llm_calls",
                json={
                    "function_name": function_name,
                    "model": model,
                    "prompt_tokens": prompt_tokens,
                    "response_tokens": response_tokens,
                    "total_tokens": total_tokens,
                    "cached": cached,
                    "duration_ms": duration_ms,
                },
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                timeout=5,
            )
        except Exception:
            pass  # best-effort: eroarea de logging nu trebuie să blocheze aplicația

    threading.Thread(target=_send, daemon=True).start()


def log_quiz_score(pdf_id: str, correct: int, total: int) -> None:
    """Loghează scorul unui quiz în quiz_scores. Fire-and-forget."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return

    def _send() -> None:
        try:
            requests.post(
                f"{SUPABASE_URL}/rest/v1/quiz_scores",
                json={"pdf_id": pdf_id, "correct": correct, "total": total},
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                timeout=5,
            )
        except Exception:
            pass

    threading.Thread(target=_send, daemon=True).start()


def log_question(pdf_id: str, question: str, answer: str) -> None:
    """Loghează o întrebare + răspuns în questions_history. Fire-and-forget."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return

    def _send() -> None:
        try:
            requests.post(
                f"{SUPABASE_URL}/rest/v1/questions_history",
                json={"pdf_id": pdf_id, "question": question, "answer": answer},
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                timeout=5,
            )
        except Exception:
            pass

    threading.Thread(target=_send, daemon=True).start()
