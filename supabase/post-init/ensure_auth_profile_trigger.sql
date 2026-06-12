CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role public.user_role;
    profile_first_name text;
    profile_last_name text;
    profile_username text;
BEGIN
    IF NEW.email = 'admin@ugal.ro' THEN
        assigned_role := 'HEAD_ADMIN'::public.user_role;
    ELSIF NEW.email LIKE 'profesor.%@ugal.ro' THEN
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
        split_part(NEW.email, '@', 1),
        NEW.id::text
    );

    INSERT INTO public.profiles (
        id, email, first_name, last_name, username, role
    )
    VALUES (
        NEW.id,
        NEW.email,
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT ALL ON public.profiles TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
