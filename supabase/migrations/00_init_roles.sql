-- ==========================================================
-- 00_init_roles.sql
-- Crearea rolurilor necesare pentru Supabase înainte de migrații
-- ==========================================================

DO $$ 
BEGIN
    -- Creare rol supabase_admin
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    -- Creare rol authenticated
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOINHERIT;
    END IF;

    -- Creare rol service_role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;
END $$;

-- Asigură permisiunile de bază (opțional, dar recomandat)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
