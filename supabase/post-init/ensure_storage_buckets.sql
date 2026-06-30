INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES
    ('images', 'images', true),
    ('documents', 'documents', true),
    ('faculty-logos', 'faculty-logos', true),
    ('complaints_images', 'complaints_images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_buckets_public_read" ON storage.buckets;
CREATE POLICY "storage_buckets_public_read"
ON storage.buckets
FOR SELECT
USING (id IN ('images', 'documents', 'faculty-logos', 'complaints_images'));

DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id IN ('images', 'documents', 'faculty-logos', 'complaints_images'));

DROP POLICY IF EXISTS "storage_head_insert" ON storage.objects;
CREATE POLICY "storage_head_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id IN ('images', 'documents', 'faculty-logos', 'complaints_images')
    AND public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA', 'PROFESOR', 'STUDENT_RESPONSABIL')
);

DROP POLICY IF EXISTS "storage_complaints_images_insert" ON storage.objects;
CREATE POLICY "storage_complaints_images_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaints_images');

DROP POLICY IF EXISTS "storage_head_update" ON storage.objects;
CREATE POLICY "storage_head_update"
ON storage.objects
FOR UPDATE
USING (
    bucket_id IN ('images', 'documents', 'faculty-logos', 'complaints_images')
    AND public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA', 'PROFESOR', 'STUDENT_RESPONSABIL')
)
WITH CHECK (
    bucket_id IN ('images', 'documents', 'faculty-logos', 'complaints_images')
    AND public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_FACULTATI', 'HEAD_CANTINA', 'PROFESOR', 'STUDENT_RESPONSABIL')
);
