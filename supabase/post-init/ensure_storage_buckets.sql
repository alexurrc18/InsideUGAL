INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES
    ('images', 'images', true),
    ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;
