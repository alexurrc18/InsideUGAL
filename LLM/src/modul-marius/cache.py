import hashlib
import sqlite3
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "llm_cache.db")
DEFAULT_TTL_HOURS = 24


def _conn() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS llm_cache (
            cache_key  TEXT PRIMARY KEY,
            response   TEXT NOT NULL,
            model      TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        )
    """)
    con.commit()
    return con


def make_key(prompt: str, model: str, temperature: float) -> str:
    raw = f"{prompt}|{model}|{temperature}"
    return hashlib.sha256(raw.encode()).hexdigest()


def get(cache_key: str) -> Optional[str]:
    with _conn() as con:
        row = con.execute(
            "SELECT response, expires_at FROM llm_cache WHERE cache_key = ?",
            (cache_key,)
        ).fetchone()

    if row is None:
        return None

    response, expires_at = row
    if datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        invalidate(cache_key)
        return None

    return response


def set(cache_key: str, response: str, model: str, ttl_hours: int = DEFAULT_TTL_HOURS) -> None:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=ttl_hours)
    with _conn() as con:
        con.execute("""
            INSERT OR REPLACE INTO llm_cache (cache_key, response, model, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
        """, (cache_key, response, model, now.isoformat(), expires.isoformat()))


def invalidate(cache_key: str) -> None:
    with _conn() as con:
        con.execute("DELETE FROM llm_cache WHERE cache_key = ?", (cache_key,))


def clear_expired() -> int:
    with _conn() as con:
        cur = con.execute(
            "DELETE FROM llm_cache WHERE expires_at < ?",
            (datetime.now(timezone.utc).isoformat(),)
        )
        return cur.rowcount
