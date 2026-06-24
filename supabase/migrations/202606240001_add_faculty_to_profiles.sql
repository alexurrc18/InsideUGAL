ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS faculty_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_faculty_id_fkey'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_faculty_id_fkey
            FOREIGN KEY (faculty_id)
            REFERENCES public.faculties(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_faculty_id
    ON public.profiles(faculty_id);
