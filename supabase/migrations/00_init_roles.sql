-- ==========================================================
-- 00_init_roles.sql
-- Roles required by the local Supabase self-hosted stack.
--
-- This file is mounted into /docker-entrypoint-initdb.d and is executed by
-- psql during the first database initialization. Keep it idempotent: the
-- Supabase Postgres image may already provide some reserved roles.
-- ==========================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOINHERIT NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOINHERIT NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOINHERIT NOLOGIN BYPASSRLS;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE ROLE supabase_auth_admin NOINHERIT LOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin NOINHERIT LOGIN SUPERUSER CREATEROLE CREATEDB REPLICATION BYPASSRLS;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
        CREATE ROLE supabase_storage_admin NOINHERIT LOGIN CREATEROLE;
    END IF;
END;
$$;

ALTER ROLE service_role WITH NOINHERIT NOLOGIN BYPASSRLS;
ALTER ROLE authenticator WITH NOINHERIT LOGIN PASSWORD 'postgres';
ALTER ROLE supabase_auth_admin WITH NOINHERIT LOGIN CREATEROLE CREATEDB PASSWORD 'postgres';
ALTER ROLE supabase_admin WITH NOINHERIT LOGIN SUPERUSER CREATEROLE CREATEDB REPLICATION BYPASSRLS PASSWORD 'postgres';
ALTER ROLE supabase_storage_admin WITH NOINHERIT LOGIN CREATEROLE PASSWORD 'postgres';

GRANT pg_read_server_files TO postgres;
GRANT pg_read_server_files TO supabase_admin;
GRANT pg_read_server_files TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION pg_catalog.pg_read_file(text) TO postgres, supabase_admin, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION pg_catalog.pg_read_file(text, bigint, bigint) TO postgres, supabase_admin, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION pg_catalog.pg_read_file(text, bigint, bigint, boolean) TO postgres, supabase_admin, supabase_auth_admin;

ALTER ROLE supabase_auth_admin SET search_path TO auth, public;
ALTER ROLE supabase_storage_admin SET search_path TO storage, public;
ALTER ROLE supabase_admin SET search_path TO public, extensions;

CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
ALTER SCHEMA auth OWNER TO supabase_auth_admin;

GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

GRANT USAGE, CREATE ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO authenticator;
GRANT USAGE ON SCHEMA auth TO service_role;

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT USAGE, CREATE ON SCHEMA public TO supabase_auth_admin;
GRANT USAGE, CREATE ON SCHEMA public TO supabase_admin;
GRANT USAGE ON SCHEMA public TO supabase_storage_admin;

-- Grant permissions to standard roles for public schema objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role, authenticated, anon;

