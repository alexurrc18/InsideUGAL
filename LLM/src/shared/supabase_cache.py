import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from supabase import create_client, Client

logger = logging.getLogger("supabase-cache")

class SupabaseCache:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        self.supabase: Optional[Client] = None
        if self.supabase_url and self.supabase_key:
            self.supabase = create_client(self.supabase_url, self.supabase_key)
        else:
            logger.warning("Supabase credentials not found for Cache. Cache disabled.")

    def get(self, cache_key: str) -> Optional[str]:
        if not self.supabase:
            return None
        
        try:
            response = self.supabase.table("llm_cache").select("response, expires_at").eq("cache_key", cache_key).execute()
            data = response.data
            if not data:
                return None
            
            row = data[0]
            expires_at = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
            
            if expires_at < datetime.now(timezone.utc):
                self.invalidate(cache_key)
                return None
                
            return row["response"]
        except Exception as e:
            logger.error(f"Error reading from Supabase cache: {e}")
            return None

    def set(self, cache_key: str, response: str, model: str, ttl_hours: int = 24) -> None:
        if not self.supabase:
            return
        
        expires_at = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
        try:
            self.supabase.table("llm_cache").upsert({
                "cache_key": cache_key,
                "response": response,
                "model": model,
                "expires_at": expires_at.isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Error writing to Supabase cache: {e}")

    def invalidate(self, cache_key: str) -> None:
        if not self.supabase:
            return
        try:
            self.supabase.table("llm_cache").delete().eq("cache_key", cache_key).execute()
        except Exception as e:
            logger.error(f"Error invalidating Supabase cache: {e}")
