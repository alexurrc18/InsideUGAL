-- ==========================================================
-- InsideUGAL Supabase schema
-- Fara module de camine/dorm si plati/payments.
-- Acopera dashboard-ul: Home, Noutati, Evenimente, Cantina,
-- Harta, Facultati, Conturi si Sesizari.
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ==========================================================
-- ENUM TYPES
-- ==========================================================

DO $$
BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'STUDENT',
        'REPREZENTANT',
        'PROFESOR',
        'CANTINA_HEAD',
        'FACULTATE_HEAD',
        'ADMIN'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE public.complaint_status AS ENUM (
        'NEW',
        'IN_PROGRESS',
        'RESOLVED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================
-- TABLES
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role public.user_role DEFAULT 'STUDENT' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    abbreviation VARCHAR(50) UNIQUE NOT NULL,
    website_url TEXT,
    dormitory_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    coordinates GEOMETRY(Point, 4326),
    faculty_id INTEGER REFERENCES public.faculties(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cafeteria_menus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    description TEXT,
    proteins DECIMAL(5, 2),
    fats DECIMAL(5, 2),
    carbohydrates DECIMAL(5, 2),
    calories INTEGER,
    grams INTEGER NOT NULL CHECK (grams > 0),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 5),
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
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
    status public.complaint_status DEFAULT 'NEW' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    image_url TEXT,
    is_event BOOLEAN DEFAULT FALSE NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    location_name VARCHAR(255),
    target_audience VARCHAR(100),
    event_redirect_id INTEGER REFERENCES public.announcements(id) ON DELETE SET NULL,
    send_push BOOLEAN DEFAULT FALSE NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==========================================================
-- INDEXES
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role
ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_locations_coordinates
ON public.locations
USING GIST(coordinates);

CREATE INDEX IF NOT EXISTS idx_locations_faculty_id
ON public.locations(faculty_id);

CREATE INDEX IF NOT EXISTS idx_cafeteria_menus_day
ON public.cafeteria_menus(day_of_week);

CREATE INDEX IF NOT EXISTS idx_complaints_status_created
ON public.complaints(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_event_start
ON public.announcements(is_event, start_date);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
ON public.announcements(created_at DESC);

-- ==========================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ==========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- UPDATED_AT TRIGGERS
-- ==========================================================

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_faculties_updated_at ON public.faculties;

CREATE TRIGGER set_faculties_updated_at
BEFORE UPDATE ON public.faculties
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_locations_updated_at ON public.locations;

CREATE TRIGGER set_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_cafeteria_menus_updated_at ON public.cafeteria_menus;

CREATE TRIGGER set_cafeteria_menus_updated_at
BEFORE UPDATE ON public.cafeteria_menus
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_complaints_updated_at ON public.complaints;

CREATE TRIGGER set_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_announcements_updated_at ON public.announcements;

CREATE TRIGGER set_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ==========================================================
-- HELPER FUNCTIONS
-- ==========================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT role
            FROM public.profiles
            WHERE id = auth.uid()
            AND is_active = TRUE
        ),
        'STUDENT'::public.user_role
    )
$$;

-- ==========================================================
-- AUTO CREATE PROFILE AFTER SIGNUP
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            'Utilizator'
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================
-- ENABLE RLS
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafeteria_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- PROFILES POLICIES
-- ==========================================================

DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;

CREATE POLICY "profiles_self_read"
ON public.profiles
FOR SELECT
USING (
    id = auth.uid()
    OR public.current_user_role() = 'ADMIN'
);

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;

CREATE POLICY "profiles_self_insert"
ON public.profiles
FOR INSERT
WITH CHECK (
    id = auth.uid()
);

DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;

CREATE POLICY "profiles_admin_manage"
ON public.profiles
FOR ALL
USING (
    public.current_user_role() = 'ADMIN'
)
WITH CHECK (
    public.current_user_role() = 'ADMIN'
);

-- ==========================================================
-- FACULTIES POLICIES
-- ==========================================================

DROP POLICY IF EXISTS "faculties_public_read" ON public.faculties;

CREATE POLICY "faculties_public_read"
ON public.faculties
FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "faculties_authorized_manage" ON public.faculties;

CREATE POLICY "faculties_authorized_manage"
ON public.faculties
FOR ALL
USING (
    public.current_user_role() IN ('ADMIN', 'FACULTATE_HEAD')
)
WITH CHECK (
    public.current_user_role() IN ('ADMIN', 'FACULTATE_HEAD')
);

-- ==========================================================
-- LOCATIONS POLICIES
-- ==========================================================

DROP POLICY IF EXISTS "locations_public_read" ON public.locations;

CREATE POLICY "locations_public_read"
ON public.locations
FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "locations_authorized_manage" ON public.locations;

CREATE POLICY "locations_authorized_manage"
ON public.locations
FOR ALL
USING (
    public.current_user_role() IN ('ADMIN', 'FACULTATE_HEAD')
)
WITH CHECK (
    public.current_user_role() IN ('ADMIN', 'FACULTATE_HEAD')
);

-- ==========================================================
-- CAFETERIA POLICIES
-- ==========================================================

DROP POLICY IF EXISTS "cafeteria_public_read" ON public.cafeteria_menus;

CREATE POLICY "cafeteria_public_read"
ON public.cafeteria_menus
FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "cafeteria_authorized_manage" ON public.cafeteria_menus;

CREATE POLICY "cafeteria_authorized_manage"
ON public.cafeteria_menus
FOR ALL
USING (
    public.current_user_role() IN ('ADMIN', 'CANTINA_HEAD')
)
WITH CHECK (
    public.current_user_role() IN ('ADMIN', 'CANTINA_HEAD')
);

-- ==========================================================
-- COMPLAINTS POLICIES
-- ==========================================================

DROP POLICY IF EXISTS "complaints_owner_or_staff_read" ON public.complaints;

CREATE POLICY "complaints_owner_or_staff_read"
ON public.complaints
FOR SELECT
USING (
    user_id = auth.uid()
    OR public.current_user_role() IN (
        'ADMIN',
        'PROFESOR',
        'FACULTATE_HEAD'
    )
);

DROP POLICY IF EXISTS "complaints_student_create" ON public.complaints;

CREATE POLICY "complaints_student_create"
ON public.complaints
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "complaints_staff_update" ON public.complaints;

CREATE POLICY "complaints_staff_update"
ON public.complaints
FOR UPDATE
USING (
    public.current_user_role() IN (
        'ADMIN',
        'PROFESOR',
        'FACULTATE_HEAD'
    )
)
WITH CHECK (
    public.current_user_role() IN (
        'ADMIN',
        'PROFESOR',
        'FACULTATE_HEAD'
    )
);

-- ==========================================================
-- ANNOUNCEMENTS POLICIES
-- ==========================================================

DROP POLICY IF EXISTS "announcements_public_read" ON public.announcements;

CREATE POLICY "announcements_public_read"
ON public.announcements
FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "announcements_authorized_manage" ON public.announcements;

CREATE POLICY "announcements_authorized_manage"
ON public.announcements
FOR ALL
USING (
    public.current_user_role() IN (
        'ADMIN',
        'PROFESOR',
        'REPREZENTANT'
    )
    AND (
        public.current_user_role() <> 'REPREZENTANT'
        OR created_by = auth.uid()
    )
)
WITH CHECK (
    public.current_user_role() IN (
        'ADMIN',
        'PROFESOR',
        'REPREZENTANT'
    )
    AND (
        public.current_user_role() <> 'REPREZENTANT'
        OR created_by = auth.uid()
    )
);