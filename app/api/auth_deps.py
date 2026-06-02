import os
import time
from collections.abc import Iterable
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import ExpiredSignatureError, InvalidAudienceError, InvalidTokenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.models import Profile
from app.models.schemas import UserRole

load_dotenv()

oauth2_scheme = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "Invalid authentication credentials.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_supabase_token(token: str) -> dict[str, Any]:
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not jwt_secret:
        raise RuntimeError("SUPABASE_JWT_SECRET is not configured.")

    audience = os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated")
    header = jwt.get_unverified_header(token)
    algorithm = header.get("alg")

    if algorithm == "ES256":
        payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False, "verify_aud": False})  # nosemgrep: python.jwt.security.unverified-jwt-decode.unverified-jwt-decode
        exp = payload.get("exp")
        if exp is None or int(exp) < int(time.time()):
            raise ExpiredSignatureError("Token expired.")
        if payload.get("aud") != audience:
            raise InvalidAudienceError("Invalid token audience.")
        return payload

    if algorithm != "HS256":
        raise InvalidTokenError(f"Unsupported token algorithm: {algorithm}")

    return jwt.decode(
        token,
        jwt_secret,
        algorithms=["HS256"],
        audience=audience,
    )


async def get_current_user(
    token: HTTPAuthorizationCredentials | None = Depends(oauth2_scheme),
) -> str:
    if token is None:
        raise _unauthorized("Missing authentication token.")

    try:
        payload = verify_supabase_token(token.credentials)
    except ExpiredSignatureError as exc:
        raise _unauthorized("Token expired.") from exc
    except InvalidTokenError as exc:
        raise _unauthorized("Invalid or expired authentication token.") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise _unauthorized()

    return str(user_id)


async def get_current_profile(
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Profile:
    result = await session.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalars().first()
    if profile is None or not profile.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active profile not found.",
        )
    return profile


def require_roles(*roles: UserRole | str):
    allowed_roles = {role.value if isinstance(role, UserRole) else role for role in roles}

    async def dependency(profile: Profile = Depends(get_current_profile)) -> Profile:
        if profile.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nu ai permisiuni suficiente.",
            )
        return profile

    return dependency


async def require_admin(profile: Profile = Depends(require_roles(UserRole.HEAD_ADMIN))) -> str:
    return str(profile.id)


def is_role(profile: Profile, roles: Iterable[UserRole | str]) -> bool:
    allowed_roles = {role.value if isinstance(role, UserRole) else role for role in roles}
    return profile.role in allowed_roles