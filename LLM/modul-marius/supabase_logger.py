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
