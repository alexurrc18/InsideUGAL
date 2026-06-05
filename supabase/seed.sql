-- 1. INSERARE CONTURI DE TEST ÎN AUTH.USERS ȘI AUTH.IDENTITIES (Cu blocul tău DO $$)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            confirmation_token, recovery_token, email_change_token_new, email_change,
            phone_change, phone_change_token, email_change_token_current, reauthentication_token,
            created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
        ) VALUES
        ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@ugal.ro', extensions.crypt('Parola123!', extensions.gen_salt('bf')), NOW(), '', '', '', '', '', '', '', '', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', FALSE),
        ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'student@ugal.ro', extensions.crypt('Parola123!', extensions.gen_salt('bf')), NOW(), '', '', '', '', '', '', '', '', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', FALSE)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider, created_at, updated_at
        ) VALUES
        (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@ugal.ro"}'::jsonb, 'email', NOW(), NOW()),
        (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '{"sub":"00000000-0000-0000-0000-000000000002","email":"student@ugal.ro"}'::jsonb, 'email', NOW(), NOW())
        ON CONFLICT (provider_id, provider) DO NOTHING;
    END IF;
END $$;

-- 2. INSERARE EXPLICITĂ ÎN PROFILES (Garantează că Anunțurile și Sesizările găsesc ID-urile)
INSERT INTO public.profiles (id, username, first_name, last_name, email, role, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'admin_test', 'Admin', 'Sistem', 'admin@ugal.ro', 'HEAD_ADMIN', true),
('00000000-0000-0000-0000-000000000002', 'student_test', 'Student', 'Test', 'student@ugal.ro', 'STUDENT', true)
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- 3. FACULTĂȚI UGAL
INSERT INTO public.faculties (id, name, abbreviation, address, phone, website_url) VALUES
(1, 'Facultatea de Automatică, Calculatoare, Inginerie Electrică și Electronică', 'ACIEE', 'Str. Științei nr. 2', '0236412345', 'https://aciee.ugal.ro'),
(2, 'Facultatea de Arhitectură Navală', 'FAN', 'Str. Domnească nr. 47', '0236412346', 'https://naoe.ugal.ro'),
(3, 'Facultatea de Educație Fizică și Sport', 'FEFS', 'Str. Gării nr. 63', '0236412347', 'https://fefs.ugal.ro')
ON CONFLICT (id) DO NOTHING;

-- 4. CATEGORII ANUNȚURI
INSERT INTO public.categories (id, name) VALUES
(1, 'Burse și Ajutoare'),
(2, 'Oportunități de Carieră'),
(3, 'Sport și Competiții'),
(4, 'Administrativ')
ON CONFLICT (id) DO NOTHING;

-- 5. LOCAȚII UGAL (Fără Corpul V)
INSERT INTO public.locations (id, name, coordinates, faculty_id) VALUES
(1, 'Corpul D (Săli Laborator)', ST_SetSRID(ST_MakePoint(28.0552, 45.4361), 4326), 1),
(2, 'Corpul G (Nave)', ST_SetSRID(ST_MakePoint(28.0531, 45.4370), 4326), 2),
(3, 'Bazinul de Înot UGAL', ST_SetSRID(ST_MakePoint(28.0510, 45.4385), 4326), 3),
(4, 'Cantina Centrală', ST_SetSRID(ST_MakePoint(28.0500, 45.4350), 4326), NULL),
(5, 'Campus LSG (Cămine)', ST_SetSRID(ST_MakePoint(28.0490, 45.4340), 4326), NULL)
ON CONFLICT (id) DO NOTHING;

-- 6. PRODUSE CANTINĂ
INSERT INTO public.products (id, name, description, quantity, price) VALUES
(1, 'Ciorbă de perișoare', 'Ciorbă tradițională cu smântână', '400g', 14.50),
(2, 'Ceafă de porc la grătar', 'Ceafă suculentă rumenită pe plită', '150g', 16.00),
(3, 'Cartofi prăjiți', 'Cartofi tăiați mare, ușor condimentați', '200g', 7.00),
(4, 'Salată de roșii cu brânză', 'Roșii proaspete și telemea de vacă', '150g', 6.50),
(5, 'Papanași cu dulceață', 'Doi papanași cu smântână și dulceață de afine', '250g', 12.00)
ON CONFLICT (id) DO NOTHING;

-- 7. MENIURI ZILNICE
INSERT INTO public.daily_menus (id, day_of_week) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_products (menu_id, product_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),
(2, 1), (2, 5),
(3, 2), (3, 3), (3, 4)
ON CONFLICT (menu_id, product_id) DO NOTHING;

-- 8. ANUNȚURI DE TEST
INSERT INTO public.announcements (id, type, created_by, title, content, faculty_id, location_name, start_date) VALUES
(1, 'NOUTATE', '00000000-0000-0000-0000-000000000001', 'Afișare liste burse semestrul 2', 'Studenții pot consulta listele preliminare la avizierul facultății. Contestațiile se depun până vineri.', 1, NULL, NULL),
(2, 'EVENIMENT', '00000000-0000-0000-0000-000000000001', 'Campionat de Fotbal Inter-Facultăți', 'Vă așteptăm să vă susțineți colegii în finala campionatului universitar!', 3, 'Teren Sintetic Campus', '2026-06-15 14:00:00')
ON CONFLICT (id) DO NOTHING;

-- 9. SESIZĂRI DE TEST
INSERT INTO public.complaints (id, user_id, location_id, title, description, status) VALUES
(1, '00000000-0000-0000-0000-000000000002', 1, 'Priză defectă în laboratorul D02', 'Ultima priză de pe rândul din dreapta este smulsă din perete și prezintă pericol.', 'in_lucru'),
(2, '00000000-0000-0000-0000-000000000002', 3, 'Temperatură scăzută apă', 'Apa din bazinul de antrenament este foarte rece de 2 zile.', 'in_asteptare')
ON CONFLICT (id) DO NOTHING;

-- 10. RESETARE SECVENȚE BAZĂ DE DATE
SELECT setval('public.faculties_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.faculties));
SELECT setval('public.categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.categories));
SELECT setval('public.locations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.locations));
SELECT setval('public.products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.products));
SELECT setval('public.daily_menus_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.daily_menus));
SELECT setval('public.announcements_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.announcements));
SELECT setval('public.complaints_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.complaints));