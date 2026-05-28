import os

import httpx
from dotenv import load_dotenv


load_dotenv()

SUPABASE_AUTH_URL = os.getenv(
    "SUPABASE_AUTH_URL",
    "http://127.0.0.1:55001/auth/v1/token?grant_type=password",
)
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH")
SUPABASE_EMAIL = os.getenv("SUPABASE_EMAIL", "admin@ugal.ro")
SUPABASE_PASSWORD = os.getenv("SUPABASE_PASSWORD", "parola-secreta-123")


response = httpx.post(
    SUPABASE_AUTH_URL,
    headers={
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    },
    json={
        "email": SUPABASE_EMAIL,
        "password": SUPABASE_PASSWORD,
    },
)

print(response.json())
