-- ==========================================================
-- MIGRARE: Extindere tabel announcements pentru linkuri, fisiere si facultati multiple
-- ==========================================================

-- Adauga coloane noi in announcements
ALTER TABLE public.announcements
    ADD COLUMN IF NOT EXISTS event_link VARCHAR(500);

ALTER TABLE public.announcements
    ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.announcements
    ADD COLUMN IF NOT EXISTS faculties JSONB DEFAULT '[]'::jsonb;

-- Migrare date existente: copiaza faculty_id (integer) intr-un array de acronime in facultati
-- Acest lucru pastreaza compatibilitatea cu datele deja existente
UPDATE public.announcements a
SET faculties = (
    SELECT jsonb_agg(f.abbreviation)
    FROM public.faculties f
    WHERE f.id = a.faculty_id
)
WHERE a.faculty_id IS NOT NULL
  AND a.faculties IS NULL;

-- Seteaza facultati = [] pentru inregistrarile care nu au niciun faculty_id
UPDATE public.announcements
SET faculties = '[]'::jsonb
WHERE faculty_id IS NULL
  AND faculties IS NULL;

-- Indecsi pentru performanta
CREATE INDEX IF NOT EXISTS idx_announcements_faculties ON public.announcements USING GIN (faculties);
CREATE INDEX IF NOT EXISTS idx_announcements_event_link ON public.announcements(event_link);
CREATE INDEX IF NOT EXISTS idx_announcements_files ON public.announcements USING GIN (files);
