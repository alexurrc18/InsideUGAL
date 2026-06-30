import os
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from supabase import Client, create_client
from supabase_auth.errors import AuthApiError, AuthError

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])  # noqa: E402

from app.rate_limit import limiter, AUTH_RATE_LIMIT  # noqa: E402


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int | None = None
    expires_at: int | None = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


def _get_required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} must be configured in .env")
    return value


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    return create_client(
        _get_required_env("SUPABASE_URL"),
        _get_required_env("SUPABASE_ANON_KEY"),
    )


def _auth_error(exc: AuthError) -> HTTPException:
    status_code = getattr(exc, "status", None) or status.HTTP_401_UNAUTHORIZED
    message = getattr(exc, "message", None) or str(exc)

    return HTTPException(
        status_code=status_code,
        detail=f"Supabase authentication failed: {message}",
    )


def _session_to_response(auth_response) -> AuthTokenResponse:
    session = getattr(auth_response, "session", None)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase did not return an auth session.",
        )

    return AuthTokenResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        token_type=session.token_type or "bearer",
        expires_in=session.expires_in,
        expires_at=session.expires_at,
    )


async def get_current_user(authorization: str = Header(...)):
    """
    Extrage și validează utilizatorul pe baza token-ului din header.
    """
    token = authorization.replace("Bearer ", "")
    supabase = get_supabase_client()
    
    try:
        # Supabase verifică validitatea token-ului
        user = supabase.auth.get_user(token)
        return user.user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token invalid sau expirat"
        )


@router.post("/login", response_model=AuthTokenResponse)
@limiter.limit(AUTH_RATE_LIMIT)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2-compatible email/password login through Supabase Auth.
    Returns both the short-lived access token and the refresh token.
    """
    supabase = get_supabase_client()

    try:
        auth_response = await run_in_threadpool(
            supabase.auth.sign_in_with_password,
            {
                "email": form_data.username,
                "password": form_data.password,
            },
        )
    except AuthApiError as exc:
        raise _auth_error(exc) from exc
    except AuthError as exc:
        raise _auth_error(exc) from exc

    return _session_to_response(auth_response)


@router.post("/refresh", response_model=AuthTokenResponse)
@limiter.limit(AUTH_RATE_LIMIT)
async def refresh_token(request: Request, payload: RefreshTokenRequest):
    """
    Exchanges a valid Supabase refresh token for a new auth session.
    Protected endpoints must continue to receive the returned access_token
    in the Authorization: Bearer header.
    """
    supabase = get_supabase_client()

    try:
        auth_response = await run_in_threadpool(
            supabase.auth.refresh_session,
            payload.refresh_token,
        )
    except AuthApiError as exc:
        raise _auth_error(exc) from exc
    except AuthError as exc:
        raise _auth_error(exc) from exc

    return _session_to_response(auth_response)


@router.post("/logout")
@limiter.limit(AUTH_RATE_LIMIT)
async def logout(request: Request):
    return {"message": "Logged out successfully"}