import os
import uuid
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Request, status

from app.api.auth_deps import require_roles_with_token
from app.models.schemas import UserRole
from app.rate_limit import limiter, AUTH_RATE_LIMIT

router = APIRouter(prefix="/upload", tags=["Uploads"])

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg"}
MAX_FILE_SIZE = 5 * 1024 * 1024

require_manage_announcements_with_token = require_roles_with_token(
    UserRole.HEAD_ADMIN,
    UserRole.HEAD_FACULTATI,
    UserRole.PROFESOR,
    UserRole.STUDENT_RESPONSABIL
)


@router.post("/image", status_code=status.HTTP_200_OK)
@limiter.limit(AUTH_RATE_LIMIT)
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    user_data: tuple[str, str] = Depends(require_manage_announcements_with_token),
):
    user_id, access_token = user_data
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type '{file.content_type}'. Allowed: png, jpg, jpeg.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size exceeds 5MB limit.",
        )

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_anon_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase Storage is not configured.",
        )

    safe_filename = Path(file.filename or "upload").name
    unique_filename = f"{uuid.uuid4()}-{safe_filename}"
    encoded_filename = quote(unique_filename)

    bucket = "announcements-images"
    upload_url = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{encoded_filename}"
    public_url = f"{supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{encoded_filename}"

    headers = {
        "apikey": supabase_anon_key,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": file.content_type or "application/octet-stream",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(upload_url, headers=headers, content=file_bytes)

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload failed.",
        )

    return {"image_url": public_url}
