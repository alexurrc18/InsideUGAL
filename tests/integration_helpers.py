import os
import time
from dataclasses import dataclass
from uuid import uuid4

import jwt
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import models, schemas

TEST_JWT_SECRET = "test-supabase-jwt-secret"


@dataclass(frozen=True)
class TestUser:
    id: str
    email: str
    headers: dict[str, str]


def make_token(user_id: str, *, email: str = "user@example.com") -> str:
    os.environ["SUPABASE_JWT_SECRET"] = TEST_JWT_SECRET
    os.environ.setdefault("SUPABASE_JWT_AUDIENCE", "authenticated")

    now = int(time.time())
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
        "email": email,
        "role": "authenticated",
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


def auth_headers(user_id: str, *, email: str = "user@example.com") -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(user_id, email=email)}"}


async def create_auth_user(db_session: AsyncSession, *, user_id: str, email: str) -> None:
    await db_session.execute(
        text(
            """
            INSERT INTO auth.users (
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at
            )
            VALUES (
                :id,
                'authenticated',
                'authenticated',
                :email,
                'test-password',
                NOW(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                '{}'::jsonb,
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {"id": user_id, "email": email},
    )


async def create_profile(
    db_session: AsyncSession,
    *,
    role: schemas.UserRole = schemas.UserRole.STUDENT,
    faculty_id: int | None = None,
    user_id: str | None = None,
    email: str | None = None,
    username: str | None = None,
    is_active: bool = True,
) -> TestUser:
    resolved_id = user_id or str(uuid4())
    resolved_email = email or f"{resolved_id}@example.com"

    await create_auth_user(db_session, user_id=resolved_id, email=resolved_email)

    result = await db_session.execute(
        select(models.Profile).where(models.Profile.id == resolved_id)
    )
    existing_profile = result.scalars().first()

    if existing_profile:
        existing_profile.username = username or f"user-{resolved_id[:8]}"
        existing_profile.first_name = "Test"
        existing_profile.last_name = role.value.title()
        existing_profile.email = resolved_email
        existing_profile.role = role.value
        existing_profile.faculty_id = faculty_id
        existing_profile.is_active = is_active
    else:
        db_session.add(
            models.Profile(
                id=resolved_id,
                username=username or f"user-{resolved_id[:8]}",
                first_name="Test",
                last_name=role.value.title(),
                email=resolved_email,
                role=role.value,
                faculty_id=faculty_id,
                is_active=is_active,
            )
        )

    await db_session.flush()

    return TestUser(
        id=resolved_id,
        email=resolved_email,
        headers=auth_headers(resolved_id, email=resolved_email),
    )


async def create_faculty(db_session: AsyncSession, *, name: str = "QA Faculty") -> models.Faculty:
    faculty = models.Faculty(
        name=f"{name} {uuid4().hex[:8]}",
        abbreviation=f"QA{uuid4().hex[:4].upper()}",
        address="Testing Street 1",
        phone="+40000000000",
        website_url="https://example.com",
    )
    db_session.add(faculty)
    await db_session.flush()
    await db_session.refresh(faculty)
    return faculty


async def create_location(db_session: AsyncSession, *, faculty_id: int | None = None) -> models.Location:
    location = models.Location(
        name=f"QA Location {uuid4().hex[:8]}",
        coordinates=None,
    )
    if faculty_id is not None:
        result = await db_session.execute(select(models.Faculty).where(models.Faculty.id == faculty_id))
        faculty = result.scalars().first()
        if faculty is not None:
            location.faculties.append(faculty)
    db_session.add(location)
    await db_session.flush()
    await db_session.refresh(location)
    return location
