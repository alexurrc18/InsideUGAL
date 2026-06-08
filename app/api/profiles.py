import os
from uuid import UUID

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import Client, create_client

from app.api.auth_deps import get_current_profile, require_admin
from app.db.database import get_db
from app.models import schemas
from app.repositories.profile_repo import ProfileRepository

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("LIPSESC CHEILE! Asigură-te că ai setat SUPABASE_URL și SUPABASE_SERVICE_KEY în fișierul .env.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

router = APIRouter(prefix="/profiles", tags=["Profiles"])
repo = ProfileRepository()


@router.get("/", response_model=list[schemas.ProfileResponse])
async def read_profiles(session: AsyncSession = Depends(get_db), current_user: str = Depends(require_admin)):
    return await repo.get_all(session)


@router.get("/me", response_model=schemas.ProfileResponse)
async def read_my_profile(profile=Depends(get_current_profile)):
    return profile


@router.get("/{profile_id}", response_model=schemas.ProfileResponse)
async def read_profile(profile_id: UUID, session: AsyncSession = Depends(get_db), current_user: str = Depends(require_admin)):
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
    try:
        # 1. Creăm contul în tabul de "Authentication" al Supabase
        auth_response = supabase.auth.admin.create_user({
            "email": profile_in.email,
            "password": "ParolaTemporara123!",
            "email_confirm": True,
            "user_metadata": {
                "username": profile_in.username,
                "first_name": profile_in.first_name,
                "last_name": profile_in.last_name,
                "role": profile_in.role.value if hasattr(profile_in.role, 'value') else profile_in.role
            }
        })

        # 2. Extragem ID-ul generat
        new_user_id = auth_response.user.id
        profile_in.id = UUID(new_user_id)

        # 3. Returnăm direct ce am creat (baza de date face restul prin trigger)
        return profile_in

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Eroare la crearea contului in Supabase: {str(e)}"
        )


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