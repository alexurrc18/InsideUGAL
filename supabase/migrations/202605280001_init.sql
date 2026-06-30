-- ==========================================================
-- 1. CREARE TIPURI ENUM
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS postgis;
-- Supabase manages the auth schema in hosted/recent local projects.
-- Do not create auth schemas or auth.uid() here: those objects are owned by
-- Supabase and recreating them can fail with "permission denied for schema auth".
-- pgcrypto is also available by default in Supabase; public.llm_calls can use
-- gen_random_uuid() without this migration owning the extension.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('STUDENT', 'STUDENT_RESPONSABIL', 'PROFESOR', 'HEAD_CANTINA', 'HEAD_FACULTATI', 'HEAD_ADMIN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_status') THEN
        CREATE TYPE public.complaint_status AS ENUM ('in_asteptare', 'in_lucru', 'finalizat', 'respins', 'solutionat');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_type') THEN
        CREATE TYPE public.post_type AS ENUM ('NOUTATE', 'EVENIMENT');
    END IF;
END $$;

-- ==========================================================
-- 2. TABELE PRINCIPALE
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(50),
    description TEXT,
    address TEXT,
    phone VARCHAR(50),
    website_url TEXT,
    dormitory_url TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    faculty_id INTEGER REFERENCES public.faculties(id) ON DELETE SET NULL,
    role public.user_role DEFAULT 'STUDENT' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.facility_schedules (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    UNIQUE (facility_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    coordinates GEOMETRY(Point, 4326),
    faculty_id INTEGER REFERENCES public.faculties(id) ON DELETE SET NULL,
    facility_id INTEGER REFERENCES public.facilities(id) ON DELETE SET NULL,
    marker VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    category_id INTEGER REFERENCES public.product_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.daily_menus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    description VARCHAR(500),
    day DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.complaints (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES public.locations(id) ON DELETE SET NULL, 
    title VARCHAR(255) NOT NULL, 
    description TEXT NOT NULL,
    image_url TEXT,
    status public.complaint_status DEFAULT 'in_asteptare' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id SERIAL PRIMARY KEY,
    type public.post_type NOT NULL, 
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255), 
    content TEXT NOT NULL, 
    image_url TEXT,
    faculty_id INTEGER REFERENCES public.faculties(id) ON DELETE SET NULL,
    location_name VARCHAR(255),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================================
-- 3. TABELE LLM (MODUL MARIUS / ȘTEFAN)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.llm_calls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY, 
    created_at timestamptz DEFAULT now() NOT NULL, 
    function_name text NOT NULL, 
    model text NOT NULL, 
    prompt_tokens integer DEFAULT 0, 
    response_tokens integer DEFAULT 0, 
    total_tokens integer DEFAULT 0, 
    cached boolean DEFAULT false, 
    duration_ms integer
);

-- Tabela actualizată conform noilor cerințe arhitecturale LLM
CREATE TABLE IF NOT EXISTS public.questions_history (
    id bigserial PRIMARY KEY, 
    created_at timestamptz DEFAULT now() NOT NULL, 
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pdf_id text NOT NULL, 
    question text NOT NULL, 
    answer text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id SERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type VARCHAR(50),
    is_valid BOOLEAN DEFAULT TRUE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (profile_id, token)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    action VARCHAR(500),
    faculty_id INTEGER REFERENCES public.faculties(id) ON DELETE SET NULL,
    sent_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_profile_id ON public.push_tokens(profile_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_is_valid ON public.push_tokens(is_valid);
CREATE INDEX IF NOT EXISTS idx_notifications_faculty_id ON public.notifications(faculty_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON public.notifications(sent_at DESC);

-- ATENȚIE: quiz_scores a fost ștearsă intenționat aici.

-- ==========================================================
-- 4. FUNCȚII AJUTĂTOARE ȘI TRIGGERE (INCLUSIV PENTRU SSO)
-- ==========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at() 
RETURNS TRIGGER AS $$ 
BEGIN 
    NEW.updated_at = NOW(); 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.current_auth_uid()
RETURNS uuid AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
BEGIN
    RETURN (
        SELECT role::text 
        FROM public.profiles 
        WHERE id = public.current_auth_uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;


-- TRIGGER-UL MAGIC PENTRU MICROSOFT SSO / LOGIN NOU
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
    -- Logica inteligentă de alocare a rolurilor
    profile_email := COALESCE(NULLIF(NEW.email, ''), NEW.id::text || '@local.invalid');
    metadata_role := upper(NULLIF(COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->>'user_role'
    ), ''));

    IF metadata_role IN ('STUDENT', 'STUDENT_RESPONSABIL', 'PROFESOR', 'HEAD_CANTINA', 'HEAD_FACULTATI', 'HEAD_ADMIN') THEN
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

    -- Inserarea profilului complet
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
        first_name = COALESCE(NULLIF(public.profiles.first_name, ''), EXCLUDED.first_name),
        last_name = COALESCE(NULLIF(public.profiles.last_name, ''), EXCLUDED.last_name),
        username = COALESCE(NULLIF(public.profiles.username, ''), EXCLUDED.username),
        role = COALESCE(public.profiles.role, EXCLUDED.role),
        is_active = true,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- The auth.users trigger is installed by a dedicated auth/profile sync migration.
-- Keep this init migration focused on public schema objects only, so it can run
-- in Supabase environments where auth is managed by the platform.

-- Declanșatoare Update (Setează timestampul automat când editezi un rând)
CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_faculties_updated_at BEFORE UPDATE ON public.faculties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_facilities_updated_at BEFORE UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_daily_menus_updated_at BEFORE UPDATE ON public.daily_menus FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions_history ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- 6. POLITICI POLICIES (RLS)
-- ==========================================================

DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;
DROP POLICY IF EXISTS "profiles_student_read_self" ON public.profiles;
CREATE POLICY "profiles_student_read_self" ON public.profiles
    FOR SELECT
    USING (id = public.current_auth_uid());

DROP POLICY IF EXISTS "profiles_student_insert_self" ON public.profiles;
CREATE POLICY "profiles_student_insert_self" ON public.profiles
    FOR INSERT
    WITH CHECK (id = public.current_auth_uid() AND role = 'STUDENT'::public.user_role);

DROP POLICY IF EXISTS "profiles_student_update_self" ON public.profiles;
CREATE POLICY "profiles_student_update_self" ON public.profiles
    FOR UPDATE
    USING (id = public.current_auth_uid() AND public.current_user_role() = 'STUDENT')
    WITH CHECK (id = public.current_auth_uid() AND role = 'STUDENT'::public.user_role);

DROP POLICY IF EXISTS "profiles_admin_manage_all" ON public.profiles;
CREATE POLICY "profiles_admin_manage_all" ON public.profiles
    FOR ALL
    USING (public.current_user_role() = 'HEAD_ADMIN')
    WITH CHECK (public.current_user_role() = 'HEAD_ADMIN');

DROP POLICY IF EXISTS "faculties_public_read" ON public.faculties;
CREATE POLICY "faculties_public_read" ON public.faculties FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "faculties_authorized_manage" ON public.faculties;
CREATE POLICY "faculties_authorized_manage" ON public.faculties FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "categories_authorized_manage" ON public.categories;
CREATE POLICY "categories_authorized_manage" ON public.categories FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'STUDENT_RESPONSABIL', 'HEAD_FACULTATI')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'STUDENT_RESPONSABIL', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "locations_public_read" ON public.locations;
CREATE POLICY "locations_public_read" ON public.locations FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "locations_authorized_manage" ON public.locations;
CREATE POLICY "locations_authorized_manage" ON public.locations FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "product_categories_public_read" ON public.product_categories;
CREATE POLICY "product_categories_public_read" ON public.product_categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "product_categories_authorized_manage" ON public.product_categories;
CREATE POLICY "product_categories_authorized_manage" ON public.product_categories FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_CANTINA', 'HEAD_FACULTATI')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_CANTINA', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "facilities_public_read" ON public.facilities;
CREATE POLICY "facilities_public_read" ON public.facilities FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "facilities_head_manage" ON public.facilities;
CREATE POLICY "facilities_head_manage" ON public.facilities FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA'));

DROP POLICY IF EXISTS "facility_schedules_public_read" ON public.facility_schedules;
CREATE POLICY "facility_schedules_public_read" ON public.facility_schedules FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "facility_schedules_head_manage" ON public.facility_schedules;
CREATE POLICY "facility_schedules_head_manage" ON public.facility_schedules FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA'));

DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "products_authorized_manage" ON public.products;
CREATE POLICY "products_authorized_manage" ON public.products FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_CANTINA')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_CANTINA'));

DROP POLICY IF EXISTS "cafeteria_public_read" ON public.daily_menus;
CREATE POLICY "cafeteria_public_read" ON public.daily_menus FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cafeteria_authorized_manage" ON public.daily_menus;
CREATE POLICY "cafeteria_authorized_manage" ON public.daily_menus FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_CANTINA')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_CANTINA'));

DROP POLICY IF EXISTS "complaints_owner_or_staff_read" ON public.complaints;
CREATE POLICY "complaints_owner_or_staff_read" ON public.complaints FOR SELECT USING (user_id = public.current_auth_uid() OR public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "complaints_student_create" ON public.complaints;
CREATE POLICY "complaints_student_create" ON public.complaints FOR INSERT WITH CHECK (user_id = public.current_auth_uid());

DROP POLICY IF EXISTS "complaints_staff_update" ON public.complaints;
CREATE POLICY "complaints_staff_update" ON public.complaints FOR UPDATE USING (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'HEAD_FACULTATI')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "announcements_public_read" ON public.announcements;
CREATE POLICY "announcements_public_read" ON public.announcements FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "announcements_authorized_manage" ON public.announcements;
CREATE POLICY "announcements_authorized_manage" ON public.announcements FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'STUDENT_RESPONSABIL') AND (public.current_user_role() <> 'STUDENT_RESPONSABIL' OR created_by = public.current_auth_uid())) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'STUDENT_RESPONSABIL') AND (public.current_user_role() <> 'STUDENT_RESPONSABIL' OR created_by = public.current_auth_uid()));

DROP POLICY IF EXISTS "notifications_admin_read" ON public.notifications;
CREATE POLICY "notifications_admin_read" ON public.notifications FOR SELECT USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "notifications_user_read" ON public.notifications;
CREATE POLICY "notifications_user_read" ON public.notifications FOR SELECT USING (faculty_id IS NULL OR faculty_id = (SELECT faculty_id FROM public.profiles WHERE id = public.current_auth_uid()));

DROP POLICY IF EXISTS "notifications_send" ON public.notifications;
CREATE POLICY "notifications_send" ON public.notifications FOR INSERT WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "push_tokens_owner_manage" ON public.push_tokens;
CREATE POLICY "push_tokens_owner_manage" ON public.push_tokens FOR ALL USING (profile_id = public.current_auth_uid()) WITH CHECK (profile_id = public.current_auth_uid());

-- ==========================================================
-- 7. INDECȘI PENTRU PERFORMANȚĂ
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_profiles_faculty_id ON public.profiles(faculty_id);
CREATE INDEX IF NOT EXISTS idx_locations_facility_id ON public.locations(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_schedules_facility_id ON public.facility_schedules(facility_id);
CREATE INDEX IF NOT EXISTS idx_daily_menus_day ON public.daily_menus(day);
CREATE INDEX IF NOT EXISTS idx_llm_calls_function ON public.llm_calls (function_name);
CREATE INDEX IF NOT EXISTS idx_llm_calls_created  ON public.llm_calls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qh_user_id ON public.questions_history(user_id); -- Nou index pentru user
CREATE INDEX IF NOT EXISTS idx_qh_pdf_id  ON public.questions_history (pdf_id);
CREATE INDEX IF NOT EXISTS idx_qh_created ON public.questions_history (created_at DESC);
