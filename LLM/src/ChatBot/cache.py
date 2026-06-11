import hashlib
import sys
import os
from typing import Optional
# Adaugă shared în path
sys.path.append(os.path.join(os.path.dirname(__file__), '../shared'))
from supabase_cache import SupabaseCache

cache = SupabaseCache()

def make_key(prompt: str, model: str) -> str:
    return hashlib.sha256(f"{model}:{prompt}".encode()).hexdigest()

def get(key: str) -> Optional[str]:
    return cache.get(key)

def set(key: str, response: str, model: str = "unknown"):
    cache.set(key, response, model)
