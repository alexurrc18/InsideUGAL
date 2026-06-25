from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["60 per minute"])

LLM_RATE_LIMIT = "5 per minute"
AUTH_RATE_LIMIT = "10 per minute"
AUTH_REFRESH_RATE_LIMIT = "20 per minute"
AUTH_LOGOUT_RATE_LIMIT = "20 per minute"
UPLOAD_RATE_LIMIT = "10 per minute"