import os
import uuid
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import get_current_profile, get_current_user, is_role
from app.api.crud import ensure_exists
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import models, schemas
from app.repositories.complaint_repo import ComplaintRepository

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
    items, total = await repo.get_page(
        session,
        limit=pagination.size,
        offset=pagination.offset,
        status=status_value,
        location_id=location_id,
        current_profile=profile,
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
async def upload_complaint_image(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
):
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Supabase Storage is not configured.")

    safe_filename = Path(file.filename or "upload").name
    unique_filename = f"{uuid.uuid4()}-{safe_filename}"
    encoded_filename = quote(unique_filename)
    
    # MODIFICARE AICI: Am adăugat bucket-ul corect "images"
    upload_url = f"{supabase_url.rstrip('/')}/storage/v1/object/images/complaints/{encoded_filename}"
    public_url = f"{supabase_url.rstrip('/')}/storage/v1/object/public/images/complaints/{encoded_filename}"
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
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
