-- Ensure deleting an announcement also removes cached translations.
-- This is intentionally idempotent because older local databases may already
-- have announcement_translations with a non-cascading foreign key.

DO $$
DECLARE
    fk_name text;
BEGIN
    IF to_regclass('public.announcement_translations') IS NULL THEN
        RETURN;
    END IF;

    SELECT c.conname
    INTO fk_name
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.announcement_translations'::regclass
      AND c.confrelid = 'public.announcements'::regclass
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.announcement_translations DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE public.announcement_translations
        ADD CONSTRAINT announcement_translations_announcement_id_fkey
        FOREIGN KEY (announcement_id)
        REFERENCES public.announcements(id)
        ON DELETE CASCADE;
END $$;
