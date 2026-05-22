import os

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt


bearer_scheme = HTTPBearer()


async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalid sau expirat",
    )

    if not jwt_secret:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token.credentials,
            jwt_secret,
            algorithms=["HS256"],
        )
        user_id = payload.get("sub")
    except JWTError as exc:
        raise credentials_exception from exc

    if not isinstance(user_id, str) or not user_id:
        raise credentials_exception

    return user_id
