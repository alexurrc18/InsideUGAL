-- ==========================================================
-- 00_init_roles.sql
-- Roles required by the local Supabase self-hosted stack.
-- Keep this idempotent: the Supabase Postgres image may create
-- some of these roles before this project init script runs.
-- ==========================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOINHERIT BYPASSRLS;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin NOINHERIT;
    END IF;
END $$;

ALTER ROLE service_role WITH NOINHERIT BYPASSRLS;
ALTER ROLE supabase_admin WITH NOINHERIT SUPERUSER CREATEROLE CREATEDB LOGIN REPLICATION PASSWORD 'postgres';

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
