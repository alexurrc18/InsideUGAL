CREATE TABLE IF NOT EXISTS public.product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES public.product_categories(id) ON DELETE SET NULL;

INSERT INTO public.product_categories (name)
VALUES
    ('Ciorbe și supe'),
    ('Garnituri'),
    ('Preparate carne'),
    ('Salate/sosuri'),
    ('Pâine'),
    ('Desert'),
    ('Meniul zilei')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_categories_public_read" ON public.product_categories;
CREATE POLICY "product_categories_public_read"
ON public.product_categories
FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "product_categories_authorized_manage" ON public.product_categories;
CREATE POLICY "product_categories_authorized_manage"
ON public.product_categories
FOR ALL
USING (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_CANTINA', 'HEAD_FACULTATI'))
WITH CHECK (public.current_user_role() IN ('HEAD_ADMIN', 'HEAD_CANTINA', 'HEAD_FACULTATI'));
