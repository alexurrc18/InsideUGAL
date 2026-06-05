-- 1. INSERARE CONTURI DE TEST ÎN AUTH.USERS ȘI AUTH.IDENTITIES
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

-- 2. INSERARE EXPLICITĂ ÎN PROFILES
INSERT INTO public.profiles (id, username, first_name, last_name, email, role, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'admin_test', 'Admin', 'Sistem', 'admin@ugal.ro', 'HEAD_ADMIN', true),
('00000000-0000-0000-0000-000000000002', 'student_test', 'Student', 'Test', 'student@ugal.ro', 'STUDENT', true)
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- 3. FACULTĂȚI UGAL EXSTINSE
INSERT INTO public.faculties (id, name, abbreviation, address, phone, website_url) VALUES
(1, 'Facultatea de Automatică, Calculatoare, Inginerie Electrică și Electronică', 'ACIEE', 'Str. Științei nr. 2', '0236412345', 'https://aciee.ugal.ro'),
(2, 'Facultatea de Arhitectură Navală', 'FAN', 'Str. Domnească nr. 47', '0236412346', 'https://naoe.ugal.ro'),
(3, 'Facultatea de Educație Fizică și Sport', 'FEFS', 'Str. Gării nr. 63', '0236412347', 'https://fefs.ugal.ro'),
(4, 'Facultatea de Inginerie', 'ING', 'Str. Domnească nr. 111', '0236412348', 'https://ing.ugal.ro'),
(5, 'Facultatea de Litere', 'LIT', 'Str. Domnească nr. 47', '0236412349', 'https://lit.ugal.ro'),
(6, 'Facultatea de Medicină și Farmacie', 'FMF', 'Str. Al. Ivanov nr. 1A', '0236412350', 'https://med.ugal.ro')
ON CONFLICT (id) DO NOTHING;

-- 4. CATEGORII ANUNȚURI EXTINSE
INSERT INTO public.categories (id, name) VALUES
(1, 'Burse și Ajutoare'),
(2, 'Oportunități de Carieră'),
(3, 'Sport și Competiții'),
(4, 'Administrativ'),
(5, 'Evenimente Studențești'),
(6, 'Practică și Laboratoare')
ON CONFLICT (id) DO NOTHING;

-- 5. LOCAȚII UGAL (Inclusiv noi corpuri și facilități)
INSERT INTO public.locations (id, name, coordinates, faculty_id) VALUES
(1, 'Corpul D (Săli Laborator)', ST_SetSRID(ST_MakePoint(28.0552, 45.4361), 4326), 1),
(2, 'Corpul G (Nave)', ST_SetSRID(ST_MakePoint(28.0531, 45.4370), 4326), 2),
(3, 'Bazinul de Înot UGAL', ST_SetSRID(ST_MakePoint(28.0510, 45.4385), 4326), 3),
(4, 'Cantina Centrală', ST_SetSRID(ST_MakePoint(28.0500, 45.4350), 4326), NULL),
(5, 'Campus LSG (Cămine)', ST_SetSRID(ST_MakePoint(28.0490, 45.4340), 4326), NULL),
(6, 'Corpul V', ST_SetSRID(ST_MakePoint(28.0530, 45.4400), 4326), 4),
(7, 'Biblioteca Centrală UGAL', ST_SetSRID(ST_MakePoint(28.0540, 45.4375), 4326), NULL),
(8, 'Corpul M (Medicină)', ST_SetSRID(ST_MakePoint(28.0450, 45.4300), 4326), 6)
ON CONFLICT (id) DO NOTHING;

-- 6. PRODUSE CANTINĂ BOGATE
INSERT INTO public.products (id, name, description, quantity, price) VALUES
(1, 'Ciorbă de perișoare', 'Ciorbă tradițională cu smântână și ardei iute', '400g', 14.50),
(2, 'Ceafă de porc la grătar', 'Ceafă suculentă rumenită pe plită', '150g', 16.00),
(3, 'Cartofi prăjiți', 'Cartofi tăiați mare, ușor condimentați', '200g', 7.00),
(4, 'Salată de roșii cu brânză', 'Roșii proaspete și telemea de vacă', '150g', 6.50),
(5, 'Papanași cu dulceață', 'Doi papanași cu smântână și dulceață de afine', '250g', 12.00),
(6, 'Ciorbă Rădăuțeană', 'Ciorbă cu piept de pui, smântână și usturoi', '400g', 15.00),
(7, 'Șnițel de pui', 'Piept de pui pane crocant', '150g', 14.00),
(8, 'Piure de cartofi', 'Cartofi proaspeți pasați cu unt și lapte', '200g', 6.00),
(9, 'Salată de varză', 'Varză albă proaspătă cu mărar', '100g', 3.50),
(10, 'Clătite cu Finetti', 'Porție de 2 clătite proaspete', '150g', 8.00)
ON CONFLICT (id) DO NOTHING;

-- 7. MENIURI ZILNICE DIVERSIFICATE
INSERT INTO public.daily_menus (id, day_of_week) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_products (menu_id, product_id) VALUES
-- Luni (Meniul 1)
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
-- Marți (Meniul 2)
(2, 6), (2, 7), (2, 8), (2, 9), (2, 10),
-- Miercuri (Meniul 3)
(3, 1), (3, 7), (3, 3), (3, 9), (3, 5),
-- Joi (Meniul 4)
(4, 6), (4, 2), (4, 8), (4, 4), (4, 10),
-- Vineri (Meniul 5)
(5, 1), (5, 6), (5, 7), (5, 3), (5, 5)
ON CONFLICT (menu_id, product_id) DO NOTHING;

-- 8. ANUNȚURI REALE UGAL
INSERT INTO public.announcements (id, type, created_by, title, content, faculty_id, location_name, start_date) VALUES
(1, 'NOUTATE', '00000000-0000-0000-0000-000000000001', 'Afișare liste preliminare burse', 'Studenții pot consulta listele preliminare la avizierul facultății ACIEE. Contestațiile se depun până vineri la secretariat.', 1, 'Corpul D', NULL),
(2, 'EVENIMENT', '00000000-0000-0000-0000-000000000001', 'Campionat de Fotbal Inter-Facultăți', 'Vă așteptăm să vă susțineți colegii în finala campionatului universitar dintre ACIEE și Inginerie!', 3, 'Teren Sintetic Campus', '2026-06-15 14:00:00'),
(3, 'NOUTATE', '00000000-0000-0000-0000-000000000001', 'Selecție Internship Thecon și Wind River Systems', 'Companiile Thecon și Wind River organizează interviuri pentru roluri de Junior Developer (focus pe Linux, Android, CI/CD). Depunerea CV-urilor se face online.', 1, 'Corpul D - Amfiteatru', '2026-06-20 10:00:00'),
(4, 'NOUTATE', '00000000-0000-0000-0000-000000000001', 'Lansare Sistem Rezervări Biblioteca UGAL', 'Noul sistem de management și rezervare a cărților, dezvoltat în Java Swing, este acum activ pentru toți studenții UGAL.', NULL, 'Biblioteca Centrală', '2026-06-10 08:00:00')
ON CONFLICT (id) DO NOTHING;

-- 9. SESIZĂRI UZTUALE ÎN CAMPUS
INSERT INTO public.complaints (id, user_id, location_id, title, description, status) VALUES
(1, '00000000-0000-0000-0000-000000000002', 1, 'Priză defectă în laboratorul de programare', 'Ultima priză de pe rândul din dreapta este smulsă din perete și prezintă pericol de electrocutare.', 'in_lucru'),
(2, '00000000-0000-0000-0000-000000000002', 3, 'Temperatură scăzută apă bazin', 'Apa din bazinul de antrenament este foarte rece de aproximativ 2 zile, imposibil de utilizat pentru cursuri.', 'in_asteptare'),
(3, '00000000-0000-0000-0000-000000000002', 5, 'Conexiune instabilă Eduroam în Căminul LSG', 'Routerul de la etajul 2 se deconectează constant de la rețea, îngreunând lucrul la proiecte.', 'in_asteptare'),
(4, '00000000-0000-0000-0000-000000000002', 7, 'Zgomot sistem ventilație', 'Sistemul de aer condiționat din sala de lectură principală scoate un zgomot puternic.', 'solutionat')
ON CONFLICT (id) DO NOTHING;

-- 10. RESETARE SECVENȚE BAZĂ DE DATE
SELECT setval('public.faculties_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.faculties));
SELECT setval('public.categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.categories));
SELECT setval('public.locations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.locations));
SELECT setval('public.products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.products));
SELECT setval('public.daily_menus_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.daily_menus));
SELECT setval('public.announcements_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.announcements));
SELECT setval('public.complaints_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.complaints));