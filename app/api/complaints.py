import os
import uuid
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_user_with_token, get_current_profile, is_role, get_current_user
from app.api.crud import ensure_exists
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import models, schemas
from app.repositories.complaint_repo import ComplaintRepository
from app.rate_limit import limiter, AUTH_RATE_LIMIT

router = APIRouter(prefix="/complaints", tags=["Complaints"])
repo = ComplaintRepository()
staff_roles = {schemas.UserRole.HEAD_ADMIN, schemas.UserRole.PROFESOR, schemas.UserRole.HEAD_FACULTATI}


async def validate_complaint_refs(payload: BaseModel, db: AsyncSession, user_id: str | None = None) -> None:
    if user_id:
        await ensure_exists(db, models.Profile, user_id, "Profile not found.")

    location_id = getattr(payload, "location_id", None)
    if location_id:
        await ensure_exists(db, models.Location, location_id, "Location not found.")


@router.get("/", response_model=schemas.PaginatedResponse[schemas.ComplaintResponse])
async def read_complaints(
    complaint_status: schemas.ComplaintStatus | None = None,
    location_id: int | None = None,
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
    profile=Depends(get_current_profile),
):
    status_value = complaint_status.value if complaint_status else None
    user_id = None if is_role(profile, staff_roles) else str(profile.id)
    items, total = await repo.get_page(
        session,
        limit=pagination.size,
        offset=pagination.offset,
        status=status_value,
        location_id=location_id,
        user_id=user_id,
    )
    return paginated_response(items, total, pagination)


@router.get("/{complaint_id}", response_model=schemas.ComplaintResponse)
async def read_complaint(
    complaint_id: int,
    session: AsyncSession = Depends(get_db),
    profile=Depends(get_current_profile),
):
    complaint = await repo.get_by_id(session, complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    if complaint.user_id != str(profile.id) and not is_role(profile, staff_roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nu ai permisiuni suficiente.")
    return complaint


@router.post("/", response_model=schemas.ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    complaint_in: schemas.ComplaintCreate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    await validate_complaint_refs(complaint_in, session, user_id=current_user)
    return await repo.create_for_user(session, complaint_in, user_id=current_user)


@router.post("/upload-image/")
@limiter.limit(AUTH_RATE_LIMIT)
async def upload_complaint_image(
    request: Request,
    file: UploadFile = File(...),
    user_data: tuple[str, str] = Depends(get_current_user_with_token),
):
    user_id, access_token = user_data
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_anon_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Supabase Storage is not configured.")

    safe_filename = Path(file.filename or "upload").name
    unique_filename = f"{uuid.uuid4()}-{safe_filename}"
    encoded_filename = quote(unique_filename)
    
    # MODIFICARE AICI: Am adăugat bucket-ul corect "images"
   # Înlocuiește liniile vechi cu acestea două:
    upload_url = f"{supabase_url.rstrip('/')}/storage/v1/object/complaints_images/{encoded_filename}"
    public_url = f"{supabase_url.rstrip('/')}/storage/v1/object/public/complaints_images/{encoded_filename}"
    
    headers = {
        "apikey": supabase_anon_key,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": file.content_type or "application/octet-stream",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(upload_url, headers=headers, content=await file.read())

    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Image upload failed.")
    return {"image_url": public_url}


@router.patch("/{complaint_id}", response_model=schemas.ComplaintResponse)
async def update_complaint(
    complaint_id: int,
    complaint_in: schemas.ComplaintUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
    profile=Depends(get_current_profile),
):
    complaint = await repo.get_by_id(session, complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    if complaint.user_id != current_user and not is_role(profile, staff_roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nu ai permisiuni suficiente.")
    if complaint_in.status is not None and not is_role(profile, staff_roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only staff can change complaint status.")

    await validate_complaint_refs(complaint_in, session)
    return await repo.update(session, complaint, complaint_in)


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_complaint(
    complaint_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
    profile=Depends(get_current_profile),
):
    complaint = await repo.get_by_id(session, complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    if complaint.user_id != current_user and not is_role(profile, staff_roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nu ai permisiuni suficiente.")
    await repo.delete(session, complaint)
