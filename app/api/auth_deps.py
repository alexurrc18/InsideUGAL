import os
import logging
from collections.abc import Iterable
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError, PyJWKClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db.database import get_db
from app.models.models import Profile
from app.models.schemas import UserRole

logger = logging.getLogger(__name__)

load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

jwks_client = PyJWKClient(
    os.environ.get(
        "SUPABASE_JWKS_URL",
        "http://127.0.0.1:54325/auth/v1/.well-known/jwks.json",
    )
)


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
    decode_options = {"verify_aud": bool(audience)}

    header = jwt.get_unverified_header(token)
    algorithm = header.get("alg")

    logger.debug(
        "Verifying Supabase JWT, algorithm: %s",
        algorithm,
    )

    # -----------------------------
    # ES256 FLOW (JWKS)
    # -----------------------------
    if algorithm == "ES256":
        logger.debug("Using ES256 via JWKS")

        signing_key = jwks_client.get_signing_key_from_jwt(token).key

        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["ES256"],
            audience=audience or None,
            options=decode_options,
        )

        return payload

    # -----------------------------
    # HS256 FLOW (SECRET)
    # -----------------------------
    if algorithm != "HS256":
        raise InvalidTokenError(f"Unsupported token algorithm: {algorithm}")

    logger.debug("Using HS256 verification")

    payload = jwt.decode(
        token,
        jwt_secret,
        algorithms=["HS256"],
        audience=audience or None,
        options=decode_options,
    )

    return payload


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
) -> str:
    if token is None:
        raise _unauthorized("Missing authentication token.")

    token_value = token.strip()

    if len(token_value) >= 2 and (
        (token_value.startswith('"') and token_value.endswith('"'))
        or (token_value.startswith("'") and token_value.endswith("'"))
    ):
        token_value = token_value[1:-1]

    try:
        payload = verify_supabase_token(token_value)

    except ExpiredSignatureError as exc:
        logger.error("JWT expired: %s", exc)
        raise _unauthorized("Token expired.") from exc

    except InvalidTokenError as exc:
        logger.error("Invalid JWT: %s", exc)
        raise _unauthorized("Invalid or expired authentication token.") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise _unauthorized("Invalid token payload.")

    return str(user_id)


async def get_current_user_token(
    token: str | None = Depends(oauth2_scheme),
) -> str:
    if token is None:
        raise _unauthorized("Missing authentication token.")

    token_value = token.strip()

    if len(token_value) >= 2 and (
        (token_value.startswith('"') and token_value.endswith('"'))
        or (token_value.startswith("'") and token_value.endswith("'"))
    ):
        token_value = token_value[1:-1]

    try:
        verify_supabase_token(token_value)
    except ExpiredSignatureError as exc:
        logger.error("JWT expired: %s", exc)
        raise _unauthorized("Token expired.") from exc
    except InvalidTokenError as exc:
        logger.error("Invalid JWT: %s", exc)
        raise _unauthorized("Invalid or expired authentication token.") from exc

    return token_value


async def get_current_profile(
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Profile:
    result = await session.execute(
        select(Profile).options(joinedload(Profile.faculty)).where(Profile.id == user_id)
    )
    profile = result.scalars().first()

    if profile is None or not profile.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active profile not found.",
        )

    return profile


def require_roles(*roles: UserRole | str):
    allowed_roles = {
        role.value if isinstance(role, UserRole) else role
        for role in roles
    }

    async def dependency(profile: Profile = Depends(get_current_profile)) -> Profile:
        if profile.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nu ai permisiuni suficiente.",
            )
        return profile

    return dependency


async def require_admin(
    profile: Profile = Depends(require_roles(UserRole.HEAD_ADMIN)),
) -> str:
    return str(profile.id)


def is_role(profile: Profile, roles: Iterable[UserRole | str]) -> bool:
    allowed_roles = {
        role.value if isinstance(role, UserRole) else role
        for role in roles
    }
    return profile.role in allowed_roles
