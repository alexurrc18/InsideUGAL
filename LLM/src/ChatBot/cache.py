import hashlib
import importlib.util
from pathlib import Path
from typing import Optional

# Import curat fără sys.path hack
_spec = importlib.util.spec_from_file_location(
    "supabase_cache",
    Path(__file__).parent.parent / "shared" / "supabase_cache.py"
)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
SupabaseCache = _mod.SupabaseCache

cache = SupabaseCache()

def make_key(prompt: str, model: str) -> str:
    return hashlib.sha256(f"{model}:{prompt}".encode()).hexdigest()

def get(key: str) -> Optional[str]:
    return cache.get(key)

def set(key: str, response: str, model: str = "unknown"):
    cache.set(key, response, model)
