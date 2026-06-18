import os
from uuid import UUID

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from requests import session
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import create_client


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

        # 2. Extragem ID-ul generat de Supabase Auth
        new_user_id = auth_response.user.id

        # 3. Convertim schema de input într-un dicționar și adăugăm ID-ul generat
        profile_data = profile_in.model_dump()
        profile_data["id"] = new_user_id

        # 4. Instanțiem modelul SQLAlchemy cu toate datele necesare
        from app.models.models import Profile
        db_profile = Profile(**profile_data)

        # 5. Salvăm în baza de date locală
        session.add(db_profile)
        await session.commit()
        await session.refresh(db_profile)

        return db_profile

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))
        
        # Ne asigurăm că returnăm obiectul din baza de date (care conține automat created_at și updated_at)
        return db_profile

    except Exception as e:
        # Gestionează erorile aici...
        raise HTTPException(status_code=400, detail=str(e))


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