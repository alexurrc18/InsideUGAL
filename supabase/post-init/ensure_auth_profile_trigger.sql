-- Roles and passwords are initialized in supabase/migrations/00_init_roles.sql.
-- Do not alter them here; this script may run after services have already
-- connected using POSTGRES_PASSWORD.

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
        NULLIF(NEW.raw_user_meta_data->>'given_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        'Student'
    );
    profile_last_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'family_name', ''),
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
        id, email, first_name, last_name, username, role, is_active
    )
    VALUES (
        NEW.id,
        profile_email,
        profile_first_name,
        profile_last_name,
        profile_username,
        assigned_role,
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        is_active = true,
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

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT ALL ON public.profiles TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Local demo Auth users. public rows are seeded by supabase/seed.sql, but
-- Supabase Auth creates auth.users later, so auth test accounts must be added
-- in this post-init phase.
WITH demo_users AS (
    SELECT *
    FROM (
        VALUES
            (
                '00000000-0000-0000-0000-000000000001'::uuid,
                'admin@ugal.ro',
                'admin',
                'Admin',
                'UGAL',
                'HEAD_ADMIN',
                '$2a$10$pcz1p0i70zk2St4CzBv1suhePjqAsabVy8UQPU6E58/RnXQQr5bUq'
            ),
            (
                '00000000-0000-0000-0000-000000000002'::uuid,
                'student@ugal.ro',
                'student_demo',
                'Student',
                'Demo',
                'STUDENT',
                '$2a$10$rNXtev6R2wVrCJOqflLgu.TYXHnMeXsKwfLiVp3wXmIIkSNEDhPrq'
            ),
            (
                '00000000-0000-0000-0000-000000000003'::uuid,
                'ion.popescu@ugal.ro',
                'prof_popescu',
                'Ion',
                'Popescu',
                'PROFESOR',
                '$2a$10$P2XXDHeRNoEAgGQIBjU3yOk8OW7XqDsTHa2hF.PkWCpCjFwpGjjbG'
            ),
            (
                '00000000-0000-0000-0000-000000000004'::uuid,
                'andrei.vasile@ugal.ro',
                'resp_camin',
                'Andrei',
                'Vasile',
                'STUDENT_RESPONSABIL',
                '$2a$10$RgZw.YZKyaARSL5Lv8Z2E.fSPQ4MoTcrso8ckb3SUEpPTPQZtInfe'
            ),
            (
                '00000000-0000-0000-0000-000000000005'::uuid,
                'maria.ionescu@ugal.ro',
                'maria_ionescu',
                'Maria',
                'Ionescu',
                'STUDENT',
                '$2a$10$QJsCQXR4Ad7JaoA3d16./..S7z.UT2TqIblc64UmkZ6mzgDLX/v7.'
            )
    ) AS users(id, email, username, first_name, last_name, role, encrypted_password)
)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone,
    phone_change,
    phone_change_token,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
)
SELECT
    '00000000-0000-0000-0000-000000000000'::uuid,
    id,
    '',
    'authenticated',
    email,
    encrypted_password,
    NOW(),
    '',
    '',
    '',
    '',
    '',
    NULL,
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
        'username', username,
        'first_name', first_name,
        'last_name', last_name,
        'role', role,
        'email_verified', true
    ),
    false,
    NOW(),
    NOW(),
    false,
    false
FROM demo_users
ON CONFLICT (id) DO UPDATE SET
    instance_id = EXCLUDED.instance_id,
    aud = EXCLUDED.aud,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
    confirmation_token = EXCLUDED.confirmation_token,
    recovery_token = EXCLUDED.recovery_token,
    email_change_token_new = EXCLUDED.email_change_token_new,
    email_change = EXCLUDED.email_change,
    email_change_token_current = EXCLUDED.email_change_token_current,
    phone = EXCLUDED.phone,
    phone_change = EXCLUDED.phone_change,
    phone_change_token = EXCLUDED.phone_change_token,
    reauthentication_token = EXCLUDED.reauthentication_token,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    is_super_admin = EXCLUDED.is_super_admin,
    is_sso_user = EXCLUDED.is_sso_user,
    is_anonymous = EXCLUDED.is_anonymous,
    updated_at = NOW();

WITH demo_users AS (
    SELECT *
    FROM (
        VALUES
            ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@ugal.ro'),
            ('00000000-0000-0000-0000-000000000002'::uuid, 'student@ugal.ro'),
            ('00000000-0000-0000-0000-000000000003'::uuid, 'ion.popescu@ugal.ro'),
            ('00000000-0000-0000-0000-000000000004'::uuid, 'andrei.vasile@ugal.ro'),
            ('00000000-0000-0000-0000-000000000005'::uuid, 'maria.ionescu@ugal.ro')
    ) AS users(id, email)
)
INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT
    id::text,
    id,
    jsonb_build_object(
        'sub', id::text,
        'email', email,
        'email_verified', true,
        'phone_verified', false
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
FROM demo_users
ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

-- Backfill/reactivate profiles for any Auth users that were created before the
-- trigger existed or whose profile was manually deactivated.
INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    username,
    role,
    is_active
)
SELECT
    u.id,
    COALESCE(NULLIF(u.email, ''), u.id::text || '@local.invalid'),
    COALESCE(NULLIF(u.raw_user_meta_data->>'first_name', ''), NULLIF(u.raw_user_meta_data->>'given_name', ''), NULLIF(u.raw_user_meta_data->>'full_name', ''), 'Student'),
    COALESCE(NULLIF(u.raw_user_meta_data->>'last_name', ''), NULLIF(u.raw_user_meta_data->>'family_name', ''), 'UGAL'),
    COALESCE(NULLIF(u.raw_user_meta_data->>'preferred_username', ''), NULLIF(u.raw_user_meta_data->>'username', ''), NULLIF(split_part(COALESCE(NULLIF(u.email, ''), u.id::text || '@local.invalid'), '@', 1), ''), u.id::text),
    CASE
        WHEN upper(NULLIF(COALESCE(u.raw_user_meta_data->>'role', u.raw_user_meta_data->>'user_role'), '')) IN ('STUDENT', 'STUDENT_RESPONSABIL', 'PROFESOR', 'HEAD_CANTINA', 'HEAD_FACULTATI', 'HEAD_ADMIN')
            THEN upper(NULLIF(COALESCE(u.raw_user_meta_data->>'role', u.raw_user_meta_data->>'user_role'), ''))::public.user_role
        WHEN COALESCE(NULLIF(u.email, ''), u.id::text || '@local.invalid') = 'admin@ugal.ro'
            THEN 'HEAD_ADMIN'::public.user_role
        WHEN COALESCE(NULLIF(u.email, ''), u.id::text || '@local.invalid') LIKE 'profesor.%@ugal.ro'
            THEN 'PROFESOR'::public.user_role
        ELSE 'STUDENT'::public.user_role
    END,
    true
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    is_active = true,
    updated_at = NOW();
