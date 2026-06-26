-- Profiles are synchronized from Supabase Auth in post-init.
-- This seed file contains only application data.

ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.locations DROP COLUMN IF EXISTS faculty_id;

CREATE TABLE IF NOT EXISTS public.daily_menus (
    id SERIAL PRIMARY KEY,
    day_of_week INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_products (
    menu_id INTEGER NOT NULL REFERENCES public.daily_menus(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.location_faculties (
    location_id INTEGER NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    PRIMARY KEY (location_id, faculty_id)
);

-- 1. FACULTIES (Actualizate cu toate facultatile din lista ta)
INSERT INTO public.faculties (id, name, abbreviation, address, phone, website_url) VALUES
(1, 'Facultatea de Automatica, Calculatoare, Inginerie Electrica si Electronica', 'ACIEE', 'Str. Stiintei nr. 2', '0236412345', 'https://aciee.ugal.ro'),
(2, 'Facultatea de Arhitectura Navala', 'FAN', 'Str. Domneasca nr. 47', '0236412346', 'https://naoe.ugal.ro'),
(3, 'Facultatea de Educatie Fizica si Sport', 'FEFS', 'Str. Garii nr. 63', '0236412347', 'https://fefs.ugal.ro'),
(4, 'Facultatea de Inginerie', 'ING', 'Str. Domneasca nr. 111', '0236412348', 'https://ing.ugal.ro'),
(5, 'Facultatea de Litere', 'LIT', 'Str. Domneasca nr. 47', '0236412349', 'https://lit.ugal.ro'),
(6, 'Facultatea de Medicina si Farmacie', 'FMF', 'Str. Al. Ivanov nr. 1A', '0236412350', 'https://med.ugal.ro'),
(7, 'Facultatea de Stiinta si Ingineria Alimentelor', 'SIA', 'Str. Domneasca nr. 111', '0236412351', 'https://sia.ugal.ro'),
(8, 'Facultatea Transfrontaliera', 'FT', 'Str. Domneasca nr. 111', '0236412352', 'https://ft.ugal.ro'),
(9, 'Facultatea de Stiinte si Mediu', 'FSM', 'Str. Domneasca nr. 111', '0236412353', 'https://fsm.ugal.ro'),
(10, 'Facultatea de Istorie, Filosofie si Teologie', 'FIFT', 'Str. Domneasca nr. 111', '0236412354', 'https://fift.ugal.ro'),
(11, 'Facultatea de Drept si Stiinte Administrative', 'FDSA', 'Str. Domneasca nr. 111', '0236412355', 'https://drept.ugal.ro'),
(12, 'Facultatea de Inginerie si Agronomie din Braila', 'FIAB', 'Str. Calea Calarasilor nr. 29, Braila', '0236412356', 'https://ingbraila.ugal.ro'),
(13, 'Facultatea de Economie si Administrarea Afacerilor', 'FEAA', 'Str. Nicolae Balcescu nr. 59-61', '0236412357', 'https://feaa.ugal.ro'),
(14, 'Facultatea de Științe ale Educației', 'FSED', 'Str. Științei nr. 2', '0336 130 164', 'https://fsed.ugal.ro'),
(15, 'Facultatea de Arte', 'FA', 'Str. Domnească nr. 111, 800201', '0336 130 163', 'https://arte.ugal.ro')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    abbreviation = EXCLUDED.abbreviation,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    website_url = EXCLUDED.website_url;

DELETE FROM public.faculties f
USING public.faculties canonical
WHERE f.id <> canonical.id
  AND f.abbreviation = canonical.abbreviation
  AND canonical.id BETWEEN 1 AND 15;

UPDATE public.faculties
SET logo_url = '/storage/v1/object/public/faculty-logos/ugal-logo.png'
WHERE logo_url IS NULL;

-- 2. PROFILES
INSERT INTO public.profiles (id, username, first_name, last_name, email, faculty_id, role, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'admin', 'Admin', 'UGAL', 'admin@ugal.ro', NULL, 'HEAD_ADMIN', TRUE),
('00000000-0000-0000-0000-000000000002', 'student_demo', 'Student', 'Demo', 'student@ugal.ro', 1, 'STUDENT', TRUE),
('00000000-0000-0000-0000-000000000003', 'prof_popescu', 'Ion', 'Popescu', 'ion.popescu@ugal.ro', 1, 'PROFESOR', TRUE),
('00000000-0000-0000-0000-000000000004', 'resp_camin', 'Andrei', 'Vasile', 'andrei.vasile@ugal.ro', 4, 'STUDENT_RESPONSABIL', TRUE),
('00000000-0000-0000-0000-000000000005', 'maria_ionescu', 'Maria', 'Ionescu', 'maria.ionescu@ugal.ro', 3, 'STUDENT', TRUE)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    faculty_id = EXCLUDED.faculty_id,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- 3. CATEGORIES
INSERT INTO public.categories (id, name) VALUES
(1, 'Burse si Ajutoare'),
(2, 'Oportunitati de Cariera'),
(3, 'Sport si Competitii'),
(4, 'Administrativ'),
(5, 'Evenimente Studentesti'),
(6, 'Practica si Laboratoare')
ON CONFLICT (id) DO NOTHING;

-- 4. PRODUCT CATEGORIES
INSERT INTO public.product_categories (id, name) VALUES
(1, 'Ciorbe si supe'),
(2, 'Garnituri'),
(3, 'Preparate carne'),
(4, 'Salate si sosuri'),
(5, 'Paine'),
(6, 'Desert'),
(7, 'Meniul zilei')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 5. FACILITIES
INSERT INTO public.facilities (id, name, description, image_url) VALUES
(1, 'Cantina Studenteasca', 'Cantina studenteasca UGAL. Program: luni-vineri 12:00-17:00.', NULL),
(2, 'Cantina Corp J', 'Cantina din Corp J. Program: luni-vineri 12:00-15:30.', NULL),
(3, 'Cantina Universitate', 'Cantina Universitate. Program: luni-joi 12:00-15:30, vineri 12:00-14:00.', NULL),
(4, 'Casa de Cultura a Studentilor', 'Facilitate pentru activitati studentesti si evenimente.', NULL),
(5, 'Stadionul Portul Rosu', 'Stadion din Galati, Str. Domneasca, 145, in perimetrul complexului portuar.', NULL),
(6, 'Departamentul de Calculatoare', 'Facilitate academica pentru activitati ale domeniului Calculatoare.', NULL),
(7, 'Sala de sport Florin Balais', 'Sala de sport din Galati, Strada Mihai Bravu 44.', NULL),
(8, 'Bazinul de Inot UGAL', 'Facilitate sportiva pentru inot.', NULL),
(9, 'Biblioteca Universitara', 'Biblioteca universitara UGAL.', NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url;

INSERT INTO public.facility_schedules (facility_id, day_of_week, open_time, close_time)
SELECT 1, day_of_week, TIME '12:00', TIME '17:00'
FROM generate_series(1, 5) AS day_of_week
ON CONFLICT (facility_id, day_of_week) DO UPDATE SET open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time;

INSERT INTO public.facility_schedules (facility_id, day_of_week, open_time, close_time)
SELECT 2, day_of_week, TIME '12:00', TIME '15:30'
FROM generate_series(1, 5) AS day_of_week
ON CONFLICT (facility_id, day_of_week) DO UPDATE SET open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time;

INSERT INTO public.facility_schedules (facility_id, day_of_week, open_time, close_time)
SELECT 3, day_of_week, TIME '12:00', TIME '15:30'
FROM generate_series(1, 4) AS day_of_week
ON CONFLICT (facility_id, day_of_week) DO UPDATE SET open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time;

INSERT INTO public.facility_schedules (facility_id, day_of_week, open_time, close_time) VALUES
(3, 5, TIME '12:00', TIME '14:00')
ON CONFLICT (facility_id, day_of_week) DO UPDATE SET open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time;

-- 6. LOCATIONS (Corpurile reale din campus)
-- ATENTIE: ST_MakePoint foloseste formatul (Longitudine, Latitudine).
INSERT INTO public.locations (id, name, coordinates, facility_id, marker) VALUES
(1, 'Corp A - Str. Garii/Str. N. Alexandrescu', ST_SetSRID(ST_MakePoint(28.0595, 45.4485), 4326), NULL, 'A'),
(2, 'Corp AE - Str. M. Stefanescu', ST_SetSRID(ST_MakePoint(28.0530, 45.4468), 4326), NULL, 'AE'),
(3, 'Corp AN - Str. Domneasca nr. 111', ST_SetSRID(ST_MakePoint(28.0531, 45.4469), 4326), NULL, 'AN'),
(4, 'Corp AR - Str. Domneasca nr. 111', ST_SetSRID(ST_MakePoint(28.0529, 45.4467), 4326), NULL, 'AR'),
(5, 'Corp AS - Str. Domneasca nr. 111', ST_SetSRID(ST_MakePoint(28.0532, 45.4468), 4326), NULL, 'AS'),
(6, 'Corp Bazin Nave - Str. Domneasca nr. 111', ST_SetSRID(ST_MakePoint(28.0528, 45.4469), 4326), NULL, 'BN'),
(7, 'Corp CN - Str. Domneasca nr. 111', ST_SetSRID(ST_MakePoint(28.0530, 45.4470), 4326), NULL, 'CN'),
(8, 'Corp D - Str. Domneasca nr. 111', ST_SetSRID(ST_MakePoint(28.0533, 45.4467), 4326), NULL, 'D'),
(9, 'Corp F - Str. Domneasca nr. 111', ST_SetSRID(ST_MakePoint(28.0527, 45.4468), 4326), NULL, 'F'),
(10, 'Corp G - Str. Stiintei nr. 2', ST_SetSRID(ST_MakePoint(28.0515, 45.4455), 4326), NULL, 'G'),
(11, 'Corp I - Str. Garii', ST_SetSRID(ST_MakePoint(28.0596, 45.4486), 4326), NULL, 'I'),
(12, 'Corp K - Str. Domneasca nr. 111', ST_SetSRID(ST_MakePoint(28.0531, 45.4466), 4326), NULL, 'K'),
(13, 'Corp Medicina 1 - Str. Eroilor', ST_SetSRID(ST_MakePoint(28.0581, 45.4428), 4326), NULL, 'M1'),
(14, 'Corp Medicina 2 - Bdul. Galati nr. 25', ST_SetSRID(ST_MakePoint(28.0250, 45.4350), 4326), NULL, 'M2'),
(15, 'Corp P - Str. Domneasca nr. 111', ST_SetSRID(ST_MakePoint(28.0532, 45.4470), 4326), NULL, 'P'),
(16, 'Corp Q - Str. Basarabiei', ST_SetSRID(ST_MakePoint(28.0490, 45.4420), 4326), NULL, 'Q'),
(17, 'Corp SB - Str. Stiintei', ST_SetSRID(ST_MakePoint(28.0516, 45.4456), 4326), NULL, 'SB'),
(18, 'Corp SC - Str. Stiintei', ST_SetSRID(ST_MakePoint(28.0514, 45.4454), 4326), NULL, 'SC'),
(19, 'Corp SD - Str. Stiintei', ST_SetSRID(ST_MakePoint(28.0517, 45.4455), 4326), NULL, 'SD'),
(20, 'Corp U (Rectorat) - Str. Domneasca nr. 47', ST_SetSRID(ST_MakePoint(28.0566, 45.4385), 4326), NULL, 'U'),
(21, 'Corp Y - Str. Stiintei nr. 2', ST_SetSRID(ST_MakePoint(28.0515, 45.4457), 4326), NULL, 'Y'),
(22, 'Cantina Studenteasca (Campus)', ST_SetSRID(ST_MakePoint(28.0487, 45.4540), 4326), 1, 'C'),
(23, 'Cantina Corp J', ST_SetSRID(ST_MakePoint(28.0527, 45.4459), 4326), 2, 'C'),
(24, 'Cantina Universitate', ST_SetSRID(ST_MakePoint(28.0557, 45.4387), 4326), 3, 'C'),
(25, 'Casa de Cultura a Studentilor', ST_SetSRID(ST_MakePoint(28.0472, 45.4546), 4326), 4, 'CCS'),
(26, 'Stadionul Portul Rosu', ST_SetSRID(ST_MakePoint(28.0758, 45.4411), 4326), 5, 'S'),
(27, 'Departamentul de Calculatoare', ST_SetSRID(ST_MakePoint(28.0520, 45.4462), 4326), 6, 'DC'),
(28, 'Sala de sport Florin Balais', ST_SetSRID(ST_MakePoint(28.0500, 45.4500), 4326), 7, 'SB'),
(29, 'Bazinul de Inot UGAL', ST_SetSRID(ST_MakePoint(28.0467, 45.4442), 4326), 8, 'B'),
(30, 'Biblioteca Universitara', ST_SetSRID(ST_MakePoint(28.0510, 45.4434), 4326), 9, 'BU')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    coordinates = EXCLUDED.coordinates,
    facility_id = EXCLUDED.facility_id,
    marker = EXCLUDED.marker;

DELETE FROM public.locations
WHERE id > 30;

DELETE FROM public.location_faculties
WHERE location_id BETWEEN 1 AND 21;

INSERT INTO public.location_faculties (location_id, faculty_id) VALUES
(3, 2),
(3, 4),
(5, 4),
(5, 5),
(5, 10),
(6, 2),
(8, 1),
(8, 4),
(8, 10),
(10, 1),
(13, 6),
(14, 6),
(17, 3),
(20, 5),
(21, 1)
ON CONFLICT (location_id, faculty_id) DO NOTHING;

-- 7. PRODUCTS
INSERT INTO public.products (id, name, description, quantity, price, category_id) VALUES
(1, 'Ciorba de perisoare', 'Ciorba traditionala cu smantana si ardei iute', '400g', 14.50, 1),
(2, 'Ceafa de porc la gratar', 'Ceafa suculenta rumenita pe plita', '150g', 16.00, 3),
(3, 'Cartofi prajiti', 'Cartofi taiati mare, usor condimentati', '200g', 7.00, 2),
(4, 'Salata de rosii cu branza', 'Rosii proaspete si telemea de vaca', '150g', 6.50, 4),
(5, 'Papanasi cu dulceata', 'Doi papanasi cu smantana si dulceata de afine', '250g', 12.00, 6),
(6, 'Ciorba Radauteana', 'Ciorba cu piept de pui, smantana si usturoi', '400g', 15.00, 1),
(7, 'Snitel de pui', 'Piept de pui pane crocant', '150g', 14.00, 3),
(8, 'Piure de cartofi', 'Cartofi proaspeti pasati cu unt si lapte', '200g', 6.00, 2),
(9, 'Salata de varza', 'Varza alba proaspata cu marar', '100g', 3.50, 4),
(10, 'Clatite cu Finetti', 'Portie de 2 clatite proaspete', '150g', 8.00, 6)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    quantity = EXCLUDED.quantity,
    price = EXCLUDED.price,
    category_id = EXCLUDED.category_id;

-- 8. DAILY MENUS (Luni-Vineri)
INSERT INTO public.daily_menus (id, day_of_week) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5)
ON CONFLICT (id) DO UPDATE SET
    day_of_week = EXCLUDED.day_of_week;

INSERT INTO public.menu_products (menu_id, product_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
(2, 6), (2, 7), (2, 8), (2, 9), (2, 10),
(3, 1), (3, 7), (3, 3), (3, 9), (3, 5),
(4, 6), (4, 2), (4, 8), (4, 4), (4, 10),
(5, 1), (5, 6), (5, 7), (5, 3), (5, 5)
ON CONFLICT (menu_id, product_id) DO NOTHING;

-- 9. ANNOUNCEMENTS
INSERT INTO public.announcements (id, type, title, content, image_url, faculty_id, location_name, start_date, end_date, created_by) VALUES
(1, 'EVENIMENT', 'Festivitatea de deschidere a anului universitar', 'Va invitam sa participati la festivitatea de deschidere a noului an universitar. Evenimentul va avea loc in holul central al universitatii.', 'https://ing.ugal.ro/Resurse/2024/WhatsApp_Image_2024-09-17_at_11.48.08.jpeg', NULL, 'Hol Central, Corp A', '2026-09-21T09:00:00Z', '2026-09-21T12:00:00Z', '00000000-0000-0000-0000-000000000001'),
(2, 'EVENIMENT', 'Hackathon de 24 ore: Inovatie in Galati', 'Esti gata sa schimbi lumea in 24 de ore? Vino la cel mai mare hackathon din regiune.', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000', 1, 'Laborator Multimedia, Corp B', '2026-11-15T10:00:00Z', '2026-11-16T10:00:00Z', '00000000-0000-0000-0000-000000000001'),
(3, 'NOUTATE', 'Noi oportunitati de burse Erasmus+', 'A fost lansat noul apel pentru mobilitati studentesti. Verifica lista universitatilor partenere si depune dosarul pana la sfarsitul lunii.', 'https://unibuc.ro/wp-content/uploads/2020/01/despre-erasmus.jpg', NULL, NULL, NULL, NULL, '00000000-0000-0000-0000-000000000001'),
(4, 'NOUTATE', 'Workshop de design grafic in weekend', 'Invata bazele designului grafic folosind instrumente moderne. Workshop-ul este gratuit pentru toti studentii UGAL.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrvLpegvQvOniv6QIbBLAB50za2oHinfK75g&s', 5, NULL, NULL, NULL, '00000000-0000-0000-0000-000000000001'),
(5, 'EVENIMENT', 'Conferinta de Inginerie Sustenabila', 'O conferinta dedicata ultimelor inovatii in domeniul ingineriei sustenabile si energiilor regenerabile.', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1000', 4, 'Aula Magna, Corp D', '2026-10-10T09:30:00Z', '2026-10-10T17:00:00Z', '00000000-0000-0000-0000-000000000001'),
(6, 'NOUTATE', 'Rezultate partiale burse de merit', 'Au fost afisate listele partiale pentru bursele de merit aferente semestrului al doilea. Contestatiile se depun online.', 'https://feaa.ugal.ro/wp-content/uploads/feaa-amalia-paharnicu.jpg', 3, NULL, NULL, NULL, '00000000-0000-0000-0000-000000000001'),
(7, 'EVENIMENT', 'Concurs de retele Cisco CCNA', 'Competitie anuala pentru pasionatii de retelistica. Probe practice pe echipamente Cisco si configurari in Packet Tracer.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Cisco_logo_blue_2016.svg/1200px-Cisco_logo_blue_2016.svg.png', 1, 'Corpul D, Sala D12', '2026-10-25T09:00:00Z', '2026-10-25T16:00:00Z', '00000000-0000-0000-0000-000000000003'),
(8, 'NOUTATE', 'Stagii de practica la companii IT', 'Peste 50 de locuri de practica deschise in domeniul dezvoltarii software pentru studentii anilor 2 si 3.', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97', 1, NULL, NULL, NULL, '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- 11. COMPLAINTS
INSERT INTO public.complaints (id, title, description, location_id, status, user_id) VALUES
(1, 'Problema retea Wi-Fi in Biblioteca', 'Semnalul eduroam se intrerupe frecvent la etajul 2 al bibliotecii. Ne ingreuneaza accesul la materiale de studiu.', 7, 'in_lucru', '00000000-0000-0000-0000-000000000002'),
(2, 'Fereastra defecta', 'Geamul termopan nu se mai inchide etans, iar in sala de clasa este foarte frig.', 1, 'in_asteptare', '00000000-0000-0000-0000-000000000005'),
(3, 'Priza topita', 'O priza din stanga tablei are urme de arsura si nu furnizeaza curent.', 6, 'finalizat', '00000000-0000-0000-0000-000000000004'),
(4, 'Lipsa apa calda', 'La etajul 3 din camin apa calda curge foarte greu dimineata.', 5, 'solutionat', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ACTUALIZARE SECVENTE
SELECT setval('public.faculties_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.faculties));
SELECT setval('public.categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.categories));
SELECT setval('public.product_categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.product_categories));
SELECT setval('public.facilities_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.facilities));
SELECT setval('public.facility_schedules_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.facility_schedules));
SELECT setval('public.locations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.locations));
SELECT setval('public.products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.products));
SELECT setval('public.daily_menus_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.daily_menus));
SELECT setval('public.announcements_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.announcements));
SELECT setval('public.complaints_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.complaints));
