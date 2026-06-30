import os
import uuid
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Request, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth_deps import require_roles, require_roles_with_token
from app.api.pagination import PaginationParams, paginated_response
from app.db.database import get_db
from app.models import models, schemas
from app.repositories.announcement_repo import AnnouncementRepository
from app.rate_limit import limiter, AUTH_RATE_LIMIT

router = APIRouter(prefix="/announcements", tags=["Announcements"])
repo = AnnouncementRepository()
manage_announcements = require_roles(
    schemas.UserRole.HEAD_ADMIN,
    schemas.UserRole.HEAD_FACULTATI,
    schemas.UserRole.PROFESOR,
    schemas.UserRole.STUDENT_RESPONSABIL,
)
manage_announcements_with_token = require_roles_with_token(
    schemas.UserRole.HEAD_ADMIN,
    schemas.UserRole.HEAD_FACULTATI,
    schemas.UserRole.PROFESOR,
    schemas.UserRole.STUDENT_RESPONSABIL
)

LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")


async def fetch_translation_from_llm(title: str, content: str, target_lang: str) -> tuple[str, str]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{LLM_SERVICE_URL}/api/v1/translate-announcement",
            json={
                "title": title,
                "content": content,
                "target_lang": target_lang,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["translated_title"], data["translated_content"]


async def validate_announcement_refs(payload: BaseModel, db: AsyncSession) -> None:
    faculties = getattr(payload, "faculties", None)

    if faculties:
        for abbr in faculties:
            result = await db.execute(select(models.Faculty).where(models.Faculty.abbreviation == abbr))
            if not result.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Faculty abbreviation '{abbr}' not found.",
                )


def validate_announcement_dates(payload: schemas.AnnouncementCreate) -> None:
    if payload.type == schemas.PostType.EVENIMENT:
        if payload.start_date is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="start_date is required for EVENIMENT announcements.",
            )
        if payload.end_date is not None and payload.end_date < payload.start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="end_date must be after start_date.",
            )


def assert_can_manage_announcement(profile, announcement: models.Announcement | None = None) -> None:
    if profile.role == schemas.UserRole.STUDENT_RESPONSABIL.value:
        if announcement is not None and announcement.created_by != str(profile.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student representatives can manage only their own announcements.")
    elif profile.role not in {
        schemas.UserRole.PROFESOR.value,
        schemas.UserRole.HEAD_ADMIN.value,
        schemas.UserRole.HEAD_FACULTATI.value,
    }:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nu ai permisiuni suficiente.")


@router.get("/", response_model=schemas.PaginatedResponse[schemas.AnnouncementResponse])
async def read_announcements(
    announcement_type: schemas.PostType | None = None,
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
):
    type_value = announcement_type.value if announcement_type else None
    items, total = await repo.get_page(session, limit=pagination.size, offset=pagination.offset, announcement_type=type_value)
    
    if lang and lang != "ro":
        for item in items:
            translation = await repo.get_translation(session, item.id, lang)
            if translation:
                item.title = translation.translated_title
                item.content = translation.translated_content
                item.is_translated = True
            else:
                try:
                    translated_title, translated_content = await fetch_translation_from_llm(
                        item.title or "", item.content, lang
                    )
                    await repo.save_translation(session, item.id, lang, translated_title, translated_content)
                    item.title = translated_title
                    item.content = translated_content
                    item.is_translated = True
                except httpx.HTTPStatusError as exc:
                    raise HTTPException(
                        status_code=503,
                        detail=f"Traducere eșuată: {exc.response.text if exc.response else str(exc)}",
                    )
                except httpx.RequestError:
                    raise HTTPException(
                        status_code=503,
                        detail="Serviciul LLM nu este disponibil pentru traducere.",
                    )
    
    return paginated_response(items, total, pagination)


@router.get("/{announcement_id}", response_model=schemas.AnnouncementResponse)
async def read_announcement(
    announcement_id: int,
    lang: str = Query(default="ro", description="Language code for translation (ro, en, fr, etc.)"),
    session: AsyncSession = Depends(get_db),
):
    announcement = await repo.get_by_id(session, announcement_id)
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")
    
    if lang and lang != "ro":
        translation = await repo.get_translation(session, announcement.id, lang)
        if translation:
            announcement.title = translation.translated_title
            announcement.content = translation.translated_content
            announcement.is_translated = True
        else:
            try:
                translated_title, translated_content = await fetch_translation_from_llm(
                    announcement.title or "", announcement.content, lang
                )
                await repo.save_translation(session, announcement.id, lang, translated_title, translated_content)
                announcement.title = translated_title
                announcement.content = translated_content
                announcement.is_translated = True
            except httpx.HTTPStatusError as exc:
                raise HTTPException(
                    status_code=503,
                    detail=f"Traducere eșuată: {exc.response.text if exc.response else str(exc)}",
                )
            except httpx.RequestError:
                raise HTTPException(
                    status_code=503,
                    detail="Serviciul LLM nu este disponibil pentru traducere.",
                )
    
    return announcement


@router.post("/", response_model=schemas.AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement_in: schemas.AnnouncementCreate,
    session: AsyncSession = Depends(get_db),
    profile=Depends(manage_announcements),
):
    await validate_announcement_refs(announcement_in, session)
    validate_announcement_dates(announcement_in)
    return await repo.create_for_user(session, announcement_in, user_id=profile.id)


@router.post("/upload-image/")
@limiter.limit(AUTH_RATE_LIMIT)
async def upload_announcement_image(
    request: Request,
    file: UploadFile = File(...),
    user_data: tuple[str, str] = Depends(manage_announcements_with_token),
):
    user_id, access_token = user_data
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_anon_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Supabase Storage is not configured.")

    safe_filename = Path(file.filename or "upload").name
    unique_filename = f"{uuid.uuid4()}-{safe_filename}"
    encoded_filename = quote(unique_filename)
    
    upload_url = f"{supabase_url.rstrip('/')}/storage/v1/object/images/announcements/{encoded_filename}"
    public_url = f"{supabase_url.rstrip('/')}/storage/v1/object/public/images/announcements/{encoded_filename}"
    
    headers = {
        "apikey": supabase_anon_key,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": file.content_type or "application/octet-stream",
    }

    file_bytes = await file.read()

    async with httpx.AsyncClient(timeout=30.0) as client:
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
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


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