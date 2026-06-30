-- ==========================================================
-- MIGRARE: Politici RLS pentru announcement_translations
-- ==========================================================

ALTER TABLE public.announcement_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcement_translations_public_read" ON public.announcement_translations;
CREATE POLICY "announcement_translations_public_read"
    ON public.announcement_translations
    FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "announcement_translations_authorized_manage" ON public.announcement_translations;
CREATE POLICY "announcement_translations_authorized_manage"
    ON public.announcement_translations
    FOR ALL
    USING (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'STUDENT_RESPONSABIL'))
    WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'PROFESOR', 'STUDENT_RESPONSABIL'));
