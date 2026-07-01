-- ==========================================================
-- MIGRARE: Extindere tabel announcements pentru linkuri, fisiere si facultati normalizate
-- ==========================================================

-- Adauga coloane noi in announcements
ALTER TABLE public.announcements
    ADD COLUMN IF NOT EXISTS event_link VARCHAR(500);

ALTER TABLE public.announcements
    ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;

-- Relatie many-to-many intre anunturi si facultati.
CREATE TABLE IF NOT EXISTS public.announcement_faculties (
    announcement_id INTEGER NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    PRIMARY KEY (announcement_id, faculty_id)
);

-- Migrare date legacy din announcements.faculty_id.
INSERT INTO public.announcement_faculties (announcement_id, faculty_id)
SELECT DISTINCT a.id, a.faculty_id
FROM public.announcements a
JOIN public.faculties f ON f.id = a.faculty_id
WHERE a.faculty_id IS NOT NULL
ON CONFLICT (announcement_id, faculty_id) DO NOTHING;

-- Compatibilitate pentru baze care au apucat sa primeasca vechea coloana JSONB faculties,
-- unde valorile sunt abrevieri din public.faculties.abbreviation.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'announcements'
          AND column_name = 'faculties'
    ) THEN
        INSERT INTO public.announcement_faculties (announcement_id, faculty_id)
        SELECT DISTINCT a.id, f.id
        FROM public.announcements a
        CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(a.faculties, '[]'::jsonb)) AS selected_faculty(abbreviation)
        JOIN public.faculties f ON f.abbreviation = selected_faculty.abbreviation
        ON CONFLICT (announcement_id, faculty_id) DO NOTHING;
    END IF;
END $$;

DROP INDEX IF EXISTS public.idx_announcements_faculties;
ALTER TABLE public.announcements DROP COLUMN IF EXISTS faculties;

-- Indecsi pentru performanta
CREATE INDEX IF NOT EXISTS idx_announcement_faculties_announcement_id ON public.announcement_faculties(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_faculties_faculty_id ON public.announcement_faculties(faculty_id);
CREATE INDEX IF NOT EXISTS idx_announcements_event_link ON public.announcements(event_link);
CREATE INDEX IF NOT EXISTS idx_announcements_files ON public.announcements USING GIN (files);
