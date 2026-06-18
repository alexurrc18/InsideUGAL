import asyncio
import os
from collections.abc import AsyncGenerator, Generator
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Setăm variabilele de mediu înainte de importurile din aplicație
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"
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

from app.db.database import Base, get_db  # noqa: E402
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

        # 1. Activăm extensia PostGIS
        await connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        await connection.commit()

        # 2. Recreăm tipul enum 'user_role' (CORECTAT INTEGRAL CU LITERE MARI DIN SCHEMAS)
        # Înlocuiește vechiul bloc pentru user_role cu acesta:
        await connection.execute(text("DROP TYPE IF EXISTS user_role CASCADE;"))
        await connection.execute(
    text("""
    CREATE TYPE user_role AS ENUM (
        'STUDENT', 
        'ADMIN', 
        'PROFESOR',          
        'STUDENT_RESPONSABIL', 
        'HEAD_FACULTATI',  
        'HEAD_ADMIN'        
    );
""")
)
        await connection.commit()

        # 3. Recreăm tipul enum 'post_type' (CORECTAT DIN 'EVENT' ÎN 'EVENIMENT')

        # Pentru POST_TYPE

        await connection.execute(text("DROP TYPE IF EXISTS post_type CASCADE;"))
        await connection.execute(
    text("""
    CREATE TYPE post_type AS ENUM ('NOUTATE', 'EVENIMENT');
""")
)
        await connection.commit()

# Pentru COMPLAINT_STATUS
        # Înlocuiește blocul DO $$ BEGIN ... END $$; pentru complaint_status cu acesta:
        await connection.execute(text("DROP TYPE IF EXISTS complaint_status CASCADE;"))
        await connection.execute(
    text("""
    CREATE TYPE complaint_status AS ENUM (
        'IN_ASTEPTARE', 
        'IN_LUCRU', 
        'FINALIZAT', 
        'RESPINS', 
        'SOLUTIONAT'
    );
""")
)
        await connection.commit()

        # 4. Creăm toate tabelele necesare în siguranță
        await connection.run_sync(Base.metadata.drop_all)  
        await connection.commit()
        
        await connection.run_sync(Base.metadata.create_all)
        await connection.commit()

        # Începem tranzacția izolată pentru testul curent
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
    async with AsyncClient(
        transport=transport, base_url="http://test"
    ) as async_client:
        yield async_client

    app.dependency_overrides.pop(get_db, None)