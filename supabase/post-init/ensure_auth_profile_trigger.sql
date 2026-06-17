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

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE ROLE supabase_auth_admin NOINHERIT LOGIN PASSWORD 'postgres';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin NOINHERIT;
    END IF;
END $$;

ALTER ROLE service_role WITH NOINHERIT BYPASSRLS;
ALTER ROLE authenticator WITH NOINHERIT LOGIN PASSWORD 'postgres';
ALTER ROLE supabase_auth_admin WITH NOINHERIT SUPERUSER CREATEROLE CREATEDB LOGIN PASSWORD 'postgres';
ALTER ROLE supabase_admin WITH NOINHERIT SUPERUSER CREATEROLE CREATEDB LOGIN REPLICATION PASSWORD 'postgres';
ALTER ROLE supabase_auth_admin SET search_path TO auth, public;

GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role public.user_role;
    metadata_role text;
    profile_email text;
    profile_first_name text;
    profile_last_name text;
    profile_username text;
BEGIN
    profile_email := COALESCE(NULLIF(NEW.email, ''), NEW.id::text || '@local.invalid');

    metadata_role := upper(NULLIF(COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->>'user_role'
    ), ''));

    IF metadata_role IN (
        'STUDENT',
        'STUDENT_RESPONSABIL',
        'PROFESOR',
        'HEAD_CANTINA',
        'HEAD_FACULTATI',
        'HEAD_ADMIN'
    ) THEN
        assigned_role := metadata_role::public.user_role;
    ELSIF profile_email = 'admin@ugal.ro' THEN
        assigned_role := 'HEAD_ADMIN'::public.user_role;
    ELSIF profile_email LIKE 'profesor.%@ugal.ro' THEN
        assigned_role := 'PROFESOR'::public.user_role;
    ELSE
        assigned_role := 'STUDENT'::public.user_role;
    END IF;

    profile_first_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        'Student'
    );
    profile_last_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
        'UGAL'
    );
    profile_username := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'preferred_username', ''),
        NULLIF(NEW.raw_user_meta_data->>'username', ''),
        NULLIF(split_part(profile_email, '@', 1), ''),
        NEW.id::text
    );

    IF EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE username = profile_username
          AND id <> NEW.id
    ) THEN
        profile_username := profile_username || '_' || left(replace(NEW.id::text, '-', ''), 8);
    END IF;

    INSERT INTO public.profiles (
        id, email, first_name, last_name, username, role
    )
    VALUES (
        NEW.id,
        profile_email,
        profile_first_name,
        profile_last_name,
        profile_username,
        assigned_role
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for auth user %, SQLSTATE %, error: %', NEW.id, SQLSTATE, SQLERRM;

    BEGIN
        INSERT INTO public.profiles (
            id, email, first_name, last_name, username, role, is_active
        )
        VALUES (
            NEW.id,
            COALESCE(NULLIF(NEW.email, ''), NEW.id::text || '@local.invalid'),
            'User',
            'Local',
            'user_' || left(replace(NEW.id::text, '-', ''), 12),
            'STUDENT'::public.user_role,
            true
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'fallback profile insert also failed for auth user %, SQLSTATE %, error: %', NEW.id, SQLSTATE, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT ALL ON public.profiles TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON FUNCTIONS TO supabase_auth_admin;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
