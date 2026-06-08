import asyncio
import os
from collections.abc import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54399/postgres"
SUPABASE_URL = "http://127.0.0.1:54325"
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
