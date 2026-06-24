ALTER TABLE public.faculties
ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE TABLE IF NOT EXISTS public.facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.facility_schedules (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CONSTRAINT ck_facility_schedules_day_of_week CHECK (day_of_week BETWEEN 1 AND 7),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    UNIQUE (facility_id, day_of_week)
);

ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS facility_id INTEGER REFERENCES public.facilities(id) ON DELETE SET NULL;

ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS marker VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_locations_facility_id ON public.locations(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_schedules_facility_id ON public.facility_schedules(facility_id);

DROP TRIGGER IF EXISTS handle_facilities_updated_at ON public.facilities;
CREATE TRIGGER handle_facilities_updated_at
BEFORE UPDATE ON public.facilities
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facilities_public_read" ON public.facilities;
CREATE POLICY "facilities_public_read"
ON public.facilities
FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "facilities_head_manage" ON public.facilities;
CREATE POLICY "facilities_head_manage"
ON public.facilities
FOR ALL
USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA'))
WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA'));

DROP POLICY IF EXISTS "facility_schedules_public_read" ON public.facility_schedules;
CREATE POLICY "facility_schedules_public_read"
ON public.facility_schedules
FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "facility_schedules_head_manage" ON public.facility_schedules;
CREATE POLICY "facility_schedules_head_manage"
ON public.facility_schedules
FOR ALL
USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA'))
WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA'));

INSERT INTO public.facilities (name, description)
VALUES
    ('Cantina Studenteasca', 'Cantina studenteasca UGAL. Program: luni-vineri 12:00-17:00.'),
    ('Cantina Corp J', 'Cantina din Corp J. Program: luni-vineri 12:00-15:30.'),
    ('Cantina Universitate', 'Cantina Universitate. Program: luni-joi 12:00-15:30, vineri 12:00-14:00.'),
    ('Casa de Cultura a Studentilor', 'Facilitate pentru activitati studentesti si evenimente.'),
    ('Sala de sport Puskin', 'Sala de sport folosita pentru activitati didactice si sportive.'),
    ('Departamentul de Calculatoare', 'Facilitate academica pentru activitati ale domeniului Calculatoare.')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description;

WITH facility AS (
    SELECT id FROM public.facilities WHERE name = 'Cantina Studenteasca'
),
days AS (
    SELECT generate_series(1, 5) AS day_of_week
)
INSERT INTO public.facility_schedules (facility_id, day_of_week, open_time, close_time)
SELECT facility.id, days.day_of_week, TIME '12:00', TIME '17:00'
FROM facility, days
ON CONFLICT (facility_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time;

WITH facility AS (
    SELECT id FROM public.facilities WHERE name = 'Cantina Corp J'
),
days AS (
    SELECT generate_series(1, 5) AS day_of_week
)
INSERT INTO public.facility_schedules (facility_id, day_of_week, open_time, close_time)
SELECT facility.id, days.day_of_week, TIME '12:00', TIME '15:30'
FROM facility, days
ON CONFLICT (facility_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time;

WITH facility AS (
    SELECT id FROM public.facilities WHERE name = 'Cantina Universitate'
),
days AS (
    SELECT generate_series(1, 4) AS day_of_week
)
INSERT INTO public.facility_schedules (facility_id, day_of_week, open_time, close_time)
SELECT facility.id, days.day_of_week, TIME '12:00', TIME '15:30'
FROM facility, days
ON CONFLICT (facility_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time;

WITH facility AS (
    SELECT id FROM public.facilities WHERE name = 'Cantina Universitate'
)
INSERT INTO public.facility_schedules (facility_id, day_of_week, open_time, close_time)
SELECT facility.id, 5, TIME '12:00', TIME '14:00'
FROM facility
ON CONFLICT (facility_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time;

INSERT INTO storage.buckets (id, name, public)
VALUES ('faculty-logos', 'faculty-logos', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "faculty_logos_public_read" ON storage.objects;
CREATE POLICY "faculty_logos_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'faculty-logos');

DROP POLICY IF EXISTS "faculty_logos_head_insert" ON storage.objects;
CREATE POLICY "faculty_logos_head_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'faculty-logos'
    AND public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA')
);

DROP POLICY IF EXISTS "faculty_logos_head_update" ON storage.objects;
CREATE POLICY "faculty_logos_head_update"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'faculty-logos'
    AND public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA')
)
WITH CHECK (
    bucket_id = 'faculty-logos'
    AND public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA')
);
