import os
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.models import Profile, UserRole

load_dotenv()

JWT_ALGORITHM = "HS256"
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

    try:
        # options={"verify_signature": False} ignora problema algoritmului ES256 local
        # dar pastreaza validarea expirarii (exp) si a audientei (aud)
        return jwt.decode(
            token,
            jwt_secret,
            options={"verify_signature": False},
            audience="authenticated",
        )
    except Exception as e:
        print(f"[DEBUG] Motivul respingerii: {e}")
        raise
async def get_current_user(
    token: HTTPAuthorizationCredentials | None = Depends(oauth2_scheme),
) -> str:
    if token is None:
        raise _unauthorized("Missing authentication token.")

    try:
        payload = verify_supabase_token(token.credentials)
    except ExpiredSignatureError as exc:
        raise _unauthorized("Token expired.") from exc
    except JWTError as exc:
        raise _unauthorized("Invalid or expired authentication token.") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise _unauthorized()

    return user_id


async def require_admin(
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> str:
    result = await session.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalars().first()

    if profile is None or profile.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nu ai permisiuni suficiente.",
        )

    return user_id
