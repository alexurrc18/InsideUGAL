-- ==========================================================
-- 1. CREARE TIPURI ENUM
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner UUID,
    public BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS bname ON storage.buckets USING BTREE (name);

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

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL, 
    email VARCHAR(255) UNIQUE NOT NULL,
    role public.user_role DEFAULT 'STUDENT' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(50),
    description TEXT,
    address TEXT,
    phone VARCHAR(50),
    website_url TEXT,
    dormitory_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    coordinates GEOMETRY(Point, 4326),
    faculty_id INTEGER REFERENCES public.faculties(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.daily_menus (
    id SERIAL PRIMARY KEY,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.menu_products (
    menu_id INTEGER REFERENCES public.daily_menus(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES public.products(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_id, product_id)
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

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
BEGIN
    RETURN (
        SELECT role::text 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- TRIGGER-UL MAGIC PENTRU MICROSOFT SSO / LOGIN NOU
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    assigned_role public.user_role;
    profile_first_name text;
    profile_last_name text;
    profile_username text;
BEGIN
    -- Logica inteligentă de alocare a rolurilor
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

    -- Inserarea profilului complet
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conectăm funcția de mai sus la momentul în care un user e creat în Supabase Auth
DO $$
BEGIN
    IF to_regclass('auth.users') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- Declanșatoare Update (Setează timestampul automat când editezi un rând)
CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_faculties_updated_at BEFORE UPDATE ON public.faculties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_daily_menus_updated_at BEFORE UPDATE ON public.daily_menus FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER handle_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================================
-- 5. ROW LEVEL SECURITY (RLS) & STORAGE
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions_history ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;

-- ==========================================================
-- 6. POLITICI POLICIES (RLS)
-- ==========================================================

DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.current_user_role() = 'HEAD_ADMIN');

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;
CREATE POLICY "profiles_admin_manage" ON public.profiles FOR ALL USING (public.current_user_role() = 'HEAD_ADMIN') WITH CHECK (public.current_user_role() = 'HEAD_ADMIN');

DROP POLICY IF EXISTS "faculties_public_read" ON public.faculties;
CREATE POLICY "faculties_public_read" ON public.faculties FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "faculties_authorized_manage" ON public.faculties;
CREATE POLICY "faculties_authorized_manage" ON public.faculties FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "locations_public_read" ON public.locations;
CREATE POLICY "locations_public_read" ON public.locations FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "locations_authorized_manage" ON public.locations;
CREATE POLICY "locations_authorized_manage" ON public.locations FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "cafeteria_public_read" ON public.daily_menus;
CREATE POLICY "cafeteria_public_read" ON public.daily_menus FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cafeteria_authorized_manage" ON public.daily_menus;
CREATE POLICY "cafeteria_authorized_manage" ON public.daily_menus FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_CANTINA')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_CANTINA'));

DROP POLICY IF EXISTS "complaints_owner_or_staff_read" ON public.complaints;
CREATE POLICY "complaints_owner_or_staff_read" ON public.complaints FOR SELECT USING (user_id = auth.uid() OR public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "complaints_student_create" ON public.complaints;
CREATE POLICY "complaints_student_create" ON public.complaints FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "complaints_staff_update" ON public.complaints;
CREATE POLICY "complaints_staff_update" ON public.complaints FOR UPDATE USING (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'HEAD_FACULTATI')) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'HEAD_FACULTATI'));

DROP POLICY IF EXISTS "announcements_public_read" ON public.announcements;
CREATE POLICY "announcements_public_read" ON public.announcements FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "announcements_authorized_manage" ON public.announcements;
CREATE POLICY "announcements_authorized_manage" ON public.announcements FOR ALL USING (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'STUDENT_RESPONSABIL') AND (public.current_user_role() <> 'STUDENT_RESPONSABIL' OR created_by = auth.uid())) WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'STUDENT_RESPONSABIL') AND (public.current_user_role() <> 'STUDENT_RESPONSABIL' OR created_by = auth.uid()));

-- ==========================================================
-- 7. INDECȘI PENTRU PERFORMANȚĂ
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_llm_calls_function ON public.llm_calls (function_name);
CREATE INDEX IF NOT EXISTS idx_llm_calls_created  ON public.llm_calls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qh_user_id ON public.questions_history(user_id); -- Nou index pentru user
CREATE INDEX IF NOT EXISTS idx_qh_pdf_id  ON public.questions_history (pdf_id);
CREATE INDEX IF NOT EXISTS idx_qh_created ON public.questions_history (created_at DESC);
