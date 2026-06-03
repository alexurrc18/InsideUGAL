-- ==========================================================
-- DATE DE TEST INSIDEUGAL (Sincronizate cu structura corecta)
-- ==========================================================

-- Utilizatori de test pentru auth.users (daca tabela exista)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
        INSERT INTO auth.users (id) VALUES
            ('00000000-0000-0000-0000-000000000001'),
            ('00000000-0000-0000-0000-000000000002')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Profii asociati utilizatorilor
INSERT INTO public.profiles (id, username, first_name, last_name, email, role, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'admin', 'Admin', 'User', 'admin@ugal.ro', 'HEAD_ADMIN', true),
('00000000-0000-0000-0000-000000000002', 'student', 'Student', 'User', 'student@ugal.ro', 'STUDENT', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.faculties (id, name, address, phone, website_url) VALUES
(1, 'Facultatea de Automatica, Calculatoare, Inginerie Electrica si Electronica', 'Str. Stiintei nr. 2', '0236412345', 'https://aciee.ugal.ro'),
(2, 'Facultatea de Inginerie', 'Str. Domneasca nr. 111', '0236412346', 'https://ing.ugal.ro'),
(3, 'Facultatea de Litere', 'Str. Domneasca nr. 47', '0236412347', 'https://lit.ugal.ro')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name) VALUES
(1, 'Eveniment Studentesc'),
(2, 'Anunt Administrativ'),
(3, 'Sport si Sanatate'),
(4, 'Voluntariat')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.locations (id, name, coordinates, faculty_id) VALUES
(1, 'Corpul D', ST_SetSRID(ST_MakePoint(28.0552, 45.4361), 4326), 1),
(2, 'Corpul V', ST_SetSRID(ST_MakePoint(28.0530, 45.4400), 4326), 2),
(3, 'Cantina Studenteasca', ST_SetSRID(ST_MakePoint(28.0500, 45.4350), 4326), NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, name, description, quantity, price) VALUES
(1, 'Ciorba radauteana', 'Ciorba cu piept de pui, smantana si usturoi', '400g', 12.50),
(2, 'Snitel de pui', 'Piept de pui pane crocant', '150g', 14.00),
(3, 'Piure de cartofi', 'Cartofi proaspeti cu unt si lapte', '200g', 6.00),
(4, 'Salata de varza', 'Varza alba proaspata', '100g', 3.50),
(5, 'Clatite cu fineti', 'Portie de 2 clatite', '150g', 8.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.daily_menus (id, day_of_week) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_products (menu_id, product_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),
(2, 2), (2, 3), (2, 5),
(3, 1), (3, 5)
ON CONFLICT ON CONSTRAINT menu_products_pkey DO NOTHING;

-- Sincronizare secvențe ID (Pentru a putea adăuga date noi din interfață fără erori de ID)
SELECT setval('public.faculties_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.faculties));
SELECT setval('public.categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.categories));
SELECT setval('public.locations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.locations));
SELECT setval('public.products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.products));
SELECT setval('public.daily_menus_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.daily_menus));