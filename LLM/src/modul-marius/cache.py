import hashlib
import sys
import os
from typing import Optional

# Adaugă directorul `src` în sys.path pentru a permite importul ca pachet
src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if src_dir not in sys.path:
    sys.path.append(src_dir)

from shared.supabase_cache import SupabaseCache

cache = SupabaseCache()
DEFAULT_TTL_HOURS = 24

def make_key(prompt: str, model: str, temperature: float) -> str:
    raw = f"{prompt}|{model}|{temperature}"
    return hashlib.sha256(raw.encode()).hexdigest()

def get(cache_key: str) -> Optional[str]:
    return cache.get(cache_key)

def set(cache_key: str, response: str, model: str, ttl_hours: int = DEFAULT_TTL_HOURS) -> None:
    cache.set(cache_key, response, model, ttl_hours)

def invalidate(cache_key: str) -> None:
    cache.invalidate(cache_key)
