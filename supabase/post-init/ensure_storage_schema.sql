CREATE SCHEMA IF NOT EXISTS storage;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
        CREATE ROLE supabase_storage_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;
END $$;

ALTER ROLE supabase_storage_admin WITH NOINHERIT CREATEROLE LOGIN NOREPLICATION;
ALTER ROLE supabase_storage_admin SET search_path TO storage;

GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL PRIVILEGES ON SCHEMA storage TO supabase_storage_admin;

CREATE TABLE IF NOT EXISTS storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL,
    owner uuid,
    public boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE storage.buckets ADD COLUMN IF NOT EXISTS owner uuid;
ALTER TABLE storage.buckets ADD COLUMN IF NOT EXISTS public boolean DEFAULT false NOT NULL;
ALTER TABLE storage.buckets ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE storage.buckets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS bname ON storage.buckets USING BTREE (name);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA storage TO supabase_storage_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA storage TO supabase_storage_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA storage TO supabase_storage_admin;
