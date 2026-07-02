import asyncio
import os
from collections.abc import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from dotenv import load_dotenv
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

load_dotenv()

POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST_PORT = os.environ.get("POSTGRES_HOST_PORT", "54399")
POSTGRES_DB = os.environ.get("POSTGRES_DB", "postgres")

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    f"postgresql+asyncpg://postgres:{POSTGRES_PASSWORD}"
    f"@127.0.0.1:{POSTGRES_HOST_PORT}/{POSTGRES_DB}"
)
SUPABASE_URL = os.environ.get("TEST_SUPABASE_URL", "http://127.0.0.1:54325")
SUPABASE_JWT_SECRET = "test-supabase-jwt-secret"
SUPABASE_JWT_AUDIENCE = "authenticated"
SUPABASE_ANON_KEY = "test-anon-key"
SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"

os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["SUPABASE_URL"] = SUPABASE_URL
os.environ["SUPABASE_JWT_SECRET"] = SUPABASE_JWT_SECRET
os.environ["SUPABASE_JWT_AUDIENCE"] = SUPABASE_JWT_AUDIENCE
os.environ["SUPABASE_ANON_KEY"] = SUPABASE_ANON_KEY
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = SUPABASE_SERVICE_ROLE_KEY

from app.db.database import get_db  # noqa: E402
from app.main import app  # noqa: E402


test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    poolclass=NullPool,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.connect() as connection:
        await connection.begin()
        await connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS public.daily_menus (
                    id SERIAL PRIMARY KEY,
                    day_of_week INTEGER NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        await connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS public.menu_products (
                    menu_id INTEGER NOT NULL REFERENCES public.daily_menus(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
                    PRIMARY KEY (menu_id, product_id)
                )
                """
            )
        )
        await connection.execute(text("ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS image_url TEXT"))
        await connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS public.location_faculties (
                    location_id INTEGER NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
                    faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
                    PRIMARY KEY (location_id, faculty_id)
                )
                """
            )
        )
        await connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS public.announcement_faculties (
                    announcement_id INTEGER NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
                    faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
                    PRIMARY KEY (announcement_id, faculty_id)
                )
                """
            )
        )
        TestingSessionLocal = async_sessionmaker(
            bind=connection,
            class_=AsyncSession,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )

        session = TestingSessionLocal()
        try:
            yield session
        finally:
            await session.close()
            await connection.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client

    app.dependency_overrides.pop(get_db, None)
