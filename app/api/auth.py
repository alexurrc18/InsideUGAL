from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be configured in .env")

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 compatible token login, get an access token for future requests.
    Uses Supabase Auth's email/password flow.
    """
    # Supabase token endpoint for email/password grant type
    token_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    
    # Prepare the payload
    payload = {
        "email": form_data.username,  # In OAuth2, 'username' field is used for email
        "password": form_data.password,
    }
    
    # Headers including the anon key
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(token_url, json=payload, headers=headers)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            # Handle non-2xx responses from Supabase
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Supabase authentication failed: {exc.response.text}",
            ) from exc
        except httpx.RequestError as exc:
            # Handle network errors
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to Supabase: {exc}",
            ) from exc
    
    # Supabase returns: { access_token, token_type, expires_in, refresh_token, user }
    # We only need to return access_token and token_type for Swagger OAuth2
    response_data = response.json()
    return {
        "access_token": response_data["access_token"],
        "token_type": response_data["token_type"],
    }


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
