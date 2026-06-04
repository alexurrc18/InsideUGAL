import os
import uuid
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles
from app.api.crud import ensure_exists
from app.db.database import get_db
from app.models import models, schemas
from app.repositories.announcement_repo import AnnouncementRepository

router = APIRouter(prefix="/announcements", tags=["Announcements"])
repo = AnnouncementRepository()
manage_announcements = require_roles(
    schemas.UserRole.HEAD_ADMIN,
    schemas.UserRole.PROFESOR,
    schemas.UserRole.STUDENT_RESPONSABIL
)


async def validate_announcement_refs(payload: BaseModel, db: AsyncSession) -> None:
    faculty_id = getattr(payload, "faculty_id", None)
    if faculty_id:
        await ensure_exists(db, models.Faculty, faculty_id, "Faculty not found.")


def assert_can_manage_announcement(profile, announcement: models.Announcement | None = None) -> None:
    if profile.role == schemas.UserRole.STUDENT_RESPONSABIL.value:
        if announcement is not None and announcement.created_by != str(profile.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student representatives can manage only their own announcements.")
    elif profile.role not in {schemas.UserRole.PROFESOR.value, schemas.UserRole.HEAD_ADMIN.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nu ai permisiuni suficiente.")


@router.get("/", response_model=list[schemas.AnnouncementResponse])
async def read_announcements(
    announcement_type: schemas.PostType | None = None,
    faculty_id: int | None = None,
    session: AsyncSession = Depends(get_db),
):
    type_value = announcement_type.value if announcement_type else None
    return await repo.get_all(session, announcement_type=type_value, faculty_id=faculty_id)


@router.get("/{announcement_id}", response_model=schemas.AnnouncementResponse)
async def read_announcement(announcement_id: int, session: AsyncSession = Depends(get_db)):
    announcement = await repo.get_by_id(session, announcement_id)
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")
    return announcement


@router.post("/", response_model=schemas.AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement_in: schemas.AnnouncementCreate,
    session: AsyncSession = Depends(get_db),
    profile=Depends(manage_announcements),
):
    await validate_announcement_refs(announcement_in, session)
    return await repo.create_for_user(session, announcement_in, user_id=profile.id)


@router.post("/upload-image/", dependencies=[Depends(manage_announcements)])
async def upload_announcement_image(
    file: UploadFile = File(...),
):
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Supabase Storage is not configured.")

    safe_filename = Path(file.filename or "upload").name
    unique_filename = f"{uuid.uuid4()}-{safe_filename}"
    encoded_filename = quote(unique_filename)
    
    upload_url = f"{supabase_url.rstrip('/')}/storage/v1/object/images/announcements/{encoded_filename}"
    public_url = f"{supabase_url.rstrip('/')}/storage/v1/object/public/images/announcements/{encoded_filename}"
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": file.content_type or "application/octet-stream",
    }

    # FIX: Citește imaginea în memorie înainte de a face request-ul HTTP
    file_bytes = await file.read()

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Trimite pachetul de biți complet către Supabase
        response = await client.post(upload_url, headers=headers, content=file_bytes)

    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Image upload failed.")
    return {"image_url": public_url}


@router.patch("/{announcement_id}", response_model=schemas.AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    announcement_in: schemas.AnnouncementUpdate,
    session: AsyncSession = Depends(get_db),
    profile=Depends(manage_announcements),
):
    announcement = await repo.get_by_id(session, announcement_id)
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")
    assert_can_manage_announcement(profile, announcement)
    await validate_announcement_refs(announcement_in, session)
    try:
        return await repo.update(session, announcement, announcement_in)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: int,
    session: AsyncSession = Depends(get_db),
    profile=Depends(manage_announcements),
):
    announcement = await repo.get_by_id(session, announcement_id)
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")
    assert_can_manage_announcement(profile, announcement)
    await repo.delete(session, announcement)