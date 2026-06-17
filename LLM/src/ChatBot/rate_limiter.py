"""
Rate limiter simplu in-memory pentru endpoint-urile de chat.
Limitează numărul de request-uri per IP/user într-o fereastră de timp.
"""
import time
import threading
from collections import defaultdict
from typing import Optional


class RateLimiter:
    def __init__(self, max_requests: int = 20, window_seconds: int = 60):
        """
        Args:
            max_requests: Număr maxim de request-uri permise în fereastră.
            window_seconds: Durata ferestrei de timp în secunde.
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self, client_id: str) -> bool:
        """Verifică dacă client_id mai are request-uri disponibile."""
        now = time.time()
        with self._lock:
            # Curăță request-urile expirate
            self._requests[client_id] = [
                t for t in self._requests[client_id]
                if now - t < self.window_seconds
            ]
            if len(self._requests[client_id]) >= self.max_requests:
                return False
            self._requests[client_id].append(now)
            return True

    def remaining(self, client_id: str) -> int:
        """Returnează numărul de request-uri rămase."""
        now = time.time()
        with self._lock:
            active = [
                t for t in self._requests[client_id]
                if now - t < self.window_seconds
            ]
            return max(0, self.max_requests - len(active))

    def cleanup(self):
        """Curăță intrările expirate din memorie."""
        now = time.time()
        with self._lock:
            expired_keys = [
                k for k, v in self._requests.items()
                if all(now - t >= self.window_seconds for t in v)
            ]
            for k in expired_keys:
                del self._requests[k]


# Instanță globală — 20 request-uri / minut per IP
chat_limiter = RateLimiter(max_requests=20, window_seconds=60)
