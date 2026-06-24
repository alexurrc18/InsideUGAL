-- Sync Supabase Auth users with public.profiles and reactivate missing/inactive profiles.
-- public.profiles has NOT NULL/UNIQUE constraints, so the trigger/backfill must
-- populate the full profile shape, not only id/is_active.

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
        id,
        email,
        first_name,
        last_name,
        username,
        role,
        is_active
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
        first_name = COALESCE(NULLIF(public.profiles.first_name, ''), EXCLUDED.first_name),
        last_name = COALESCE(NULLIF(public.profiles.last_name, ''), EXCLUDED.last_name),
        username = COALESCE(NULLIF(public.profiles.username, ''), EXCLUDED.username),
        role = COALESCE(public.profiles.role, EXCLUDED.role),
        is_active = true,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill/fix existing auth users that are missing a profile or have an inactive one.
WITH auth_profiles AS (
    SELECT
        u.id,
        COALESCE(NULLIF(u.email, ''), u.id::text || '@local.invalid') AS email,
        COALESCE(
            NULLIF(u.raw_user_meta_data->>'first_name', ''),
            NULLIF(u.raw_user_meta_data->>'given_name', ''),
            NULLIF(u.raw_user_meta_data->>'full_name', ''),
            'Student'
        ) AS first_name,
        COALESCE(
            NULLIF(u.raw_user_meta_data->>'last_name', ''),
            NULLIF(u.raw_user_meta_data->>'family_name', ''),
            'UGAL'
        ) AS last_name,
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.username = COALESCE(
                    NULLIF(u.raw_user_meta_data->>'preferred_username', ''),
                    NULLIF(u.raw_user_meta_data->>'username', ''),
                    NULLIF(split_part(COALESCE(NULLIF(u.email, ''), u.id::text || '@local.invalid'), '@', 1), ''),
                    u.id::text
                )
                AND p.id <> u.id
            )
            THEN COALESCE(
                NULLIF(u.raw_user_meta_data->>'preferred_username', ''),
                NULLIF(u.raw_user_meta_data->>'username', ''),
                NULLIF(split_part(COALESCE(NULLIF(u.email, ''), u.id::text || '@local.invalid'), '@', 1), ''),
                u.id::text
            ) || '_' || left(replace(u.id::text, '-', ''), 8)
            ELSE COALESCE(
                NULLIF(u.raw_user_meta_data->>'preferred_username', ''),
                NULLIF(u.raw_user_meta_data->>'username', ''),
                NULLIF(split_part(COALESCE(NULLIF(u.email, ''), u.id::text || '@local.invalid'), '@', 1), ''),
                u.id::text
            )
        END AS username,
        CASE
            WHEN upper(NULLIF(COALESCE(u.raw_user_meta_data->>'role', u.raw_user_meta_data->>'user_role'), '')) IN (
                'STUDENT',
                'STUDENT_RESPONSABIL',
                'PROFESOR',
                'HEAD_CANTINA',
                'HEAD_FACULTATI',
                'HEAD_ADMIN'
            )
                THEN upper(NULLIF(COALESCE(u.raw_user_meta_data->>'role', u.raw_user_meta_data->>'user_role'), ''))::public.user_role
            WHEN COALESCE(NULLIF(u.email, ''), u.id::text || '@local.invalid') = 'admin@ugal.ro'
                THEN 'HEAD_ADMIN'::public.user_role
            WHEN COALESCE(NULLIF(u.email, ''), u.id::text || '@local.invalid') LIKE 'profesor.%@ugal.ro'
                THEN 'PROFESOR'::public.user_role
            ELSE 'STUDENT'::public.user_role
        END AS role
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
       OR p.is_active IS DISTINCT FROM true
)
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
    id,
    email,
    first_name,
    last_name,
    username,
    role,
    true
FROM auth_profiles
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(public.profiles.first_name, ''), EXCLUDED.first_name),
    last_name = COALESCE(NULLIF(public.profiles.last_name, ''), EXCLUDED.last_name),
    username = COALESCE(NULLIF(public.profiles.username, ''), EXCLUDED.username),
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    is_active = true,
    updated_at = NOW();
