import os
from functools import lru_cache
from uuid import UUID

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import Client, create_client
from supabase_auth.errors import AuthApiError, AuthError

from app.api.auth_deps import get_current_profile, require_admin
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import schemas
from app.repositories.profile_repo import ProfileRepository

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

router = APIRouter(prefix="/profiles", tags=["Profiles"])
repo = ProfileRepository()


@lru_cache(maxsize=1)
def get_supabase_admin_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Lipsesc SUPABASE_URL si SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY."
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


async def _find_auth_user_id(
    session: AsyncSession,
    *,
    user_id: UUID | None,
    email: str,
) -> str | None:
    if user_id is not None:
        result = await session.execute(
            text(
                """
                SELECT id::text
                FROM auth.users
                WHERE id = CAST(:user_id AS uuid)
                   OR email = :email
                LIMIT 1
                """
            ),
            {
                "user_id": str(user_id),
                "email": email,
            },
        )
        return result.scalar_one_or_none()

    result = await session.execute(
        text(
            """
            SELECT id::text
            FROM auth.users
            WHERE email = :email
            LIMIT 1
            """
        ),
        {
            "email": email,
        },
    )
    return result.scalar_one_or_none()


@router.get("/", response_model=schemas.PaginatedResponse[schemas.ProfileResponse])
async def read_profiles(
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    items, total = await repo.get_page(session, limit=pagination.size, offset=pagination.offset)
    return paginated_response(items, total, pagination)


@router.get("/me", response_model=schemas.ProfileResponse)
async def read_my_profile(profile=Depends(get_current_profile)):
    return profile


@router.get("/{profile_id}", response_model=schemas.ProfileResponse)
async def read_profile(
    profile_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    profile = await repo.get_by_id(session, str(profile_id))
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return profile


@router.post("/", response_model=schemas.ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_in: schemas.ProfileCreate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    auth_user_id = await _find_auth_user_id(
        session,
        user_id=profile_in.id,
        email=profile_in.email,
    )

    try:
        if auth_user_id is None:
            supabase = get_supabase_admin_client()
            auth_response = await run_in_threadpool(
                supabase.auth.admin.create_user,
                {
                    "email": profile_in.email,
                    "password": "ParolaTemporara123!",
                    "email_confirm": True,
                    "user_metadata": {
                        "username": profile_in.username,
                        "first_name": profile_in.first_name,
                        "last_name": profile_in.last_name,
                        "role": profile_in.role.value if hasattr(profile_in.role, "value") else profile_in.role,
                    },
                },
            )
            auth_user_id = str(auth_response.user.id)

        return await repo.upsert_from_create(
            session,
            profile_in,
            profile_id=auth_user_id,
        )

    except AuthApiError as e:
        raise HTTPException(
            status_code=getattr(e, "status", None) or status.HTTP_400_BAD_REQUEST,
            detail=f"Eroare la crearea contului in Supabase: {getattr(e, 'message', str(e))}",
        ) from e
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Eroare la crearea contului in Supabase: {getattr(e, 'message', str(e))}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Eroare la crearea profilului: {str(e)}",
        ) from e


@router.patch("/{profile_id}", response_model=schemas.ProfileResponse)
async def update_profile(
    profile_id: UUID,
    profile_in: schemas.ProfileUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    profile = await repo.get_by_id(session, str(profile_id))
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return await repo.update(session, profile, profile_in)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(require_admin),
):
    profile = await repo.get_by_id(session, str(profile_id))
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    await repo.delete(session, profile)
