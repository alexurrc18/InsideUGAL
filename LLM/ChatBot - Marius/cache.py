import sqlite3
import hashlib
import os
from datetime import datetime

CACHE_DB = os.path.join(os.path.dirname(__file__), "response_cache.db")
CACHE_TTL_HOURS = 24


def _conn():
    c = sqlite3.connect(CACHE_DB)
    c.execute("""
        CREATE TABLE IF NOT EXISTS cache (
            key  TEXT PRIMARY KEY,
            resp TEXT NOT NULL,
            ts   TEXT NOT NULL
        )
    """)
    return c


def make_key(prompt: str, model: str) -> str:
    return hashlib.sha256(f"{model}:{prompt}".encode()).hexdigest()


def get(key: str):
    c = _conn()
    try:
        row = c.execute("SELECT resp, ts FROM cache WHERE key=?", (key,)).fetchone()
        if not row:
            return None
        age = (datetime.now() - datetime.fromisoformat(row[1])).total_seconds() / 3600
        if age > CACHE_TTL_HOURS:
            c.execute("DELETE FROM cache WHERE key=?", (key,))
            c.commit()
            return None
        return row[0]
    finally:
        c.close()


def set(key: str, response: str):
    c = _conn()
    try:
        c.execute(
            "INSERT OR REPLACE INTO cache (key, resp, ts) VALUES (?,?,?)",
            (key, response, datetime.now().isoformat()),
        )
        c.commit()
    finally:
        c.close()
