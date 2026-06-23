-- Profiles are synchronized from Supabase Auth in post-init.
-- This seed file contains only application data.

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
(12, 'Facultatea de Inginerie si Agronomie din Braila', 'FIAB', 'Str. Calea Calarasilor nr. 29', '0236412356', 'https://ingbraila.ugal.ro'),
(13, 'Facultatea de Economie si Administrarea Afacerilor', 'FEAA', 'Str. Nicolae Balcescu nr. 59-61', '0236412357', 'https://feaa.ugal.ro')
ON CONFLICT (id) DO NOTHING;

-- 2. CATEGORIES
INSERT INTO public.categories (id, name) VALUES
(1, 'Burse si Ajutoare'),
(2, 'Oportunitati de Cariera'),
(3, 'Sport si Competitii'),
(4, 'Administrativ'),
(5, 'Evenimente Studentesti'),
(6, 'Practica si Laboratoare')
ON CONFLICT (id) DO NOTHING;

-- 3. LOCATIONS (Coordonate actualizate si legate de facultati)
-- ATENTIE: ST_MakePoint foloseste formatul (Longitudine, Latitudine)
INSERT INTO public.locations (id, name, coordinates, faculty_id) VALUES
(1, 'Facultatea de Inginerie', ST_SetSRID(ST_MakePoint(28.05365730305638, 45.446611946971665), 4326), 4),
(2, 'Departamentul de Calculatoare (ACIEE)', ST_SetSRID(ST_MakePoint(28.052046016019304, 45.44622578087715), 4326), 1),
(3, 'Bazinul de Inot UGAL', ST_SetSRID(ST_MakePoint(28.04673446530012, 45.44419568490601), 4326), NULL),
(4, 'Cantina Campusul Stiintei', ST_SetSRID(ST_MakePoint(28.052710028020087, 45.44602477034184), 4326), NULL),
(5, 'Corp Y', ST_SetSRID(ST_MakePoint(28.052143987457615, 45.445769426854746), 4326), NULL),
(6, 'Camin LSG', ST_SetSRID(ST_MakePoint(28.053204152466954, 45.44571432070904), 4326), NULL),
(7, 'Corp H', ST_SetSRID(ST_MakePoint(28.05314354813428, 45.44637224366411), 4326), NULL),
(8, 'Facultatea de Stiinta si Ingineria Alimentelor', ST_SetSRID(ST_MakePoint(28.052698584701066, 45.44647182657123), 4326), 7),
(9, 'Facultatea de Arhitectura Navala', ST_SetSRID(ST_MakePoint(28.05311589811024, 45.44664558272592), 4326), 2),
(10, 'Facultatea Transfrontaliera', ST_SetSRID(ST_MakePoint(28.05233899612814, 45.44670768805588), 4326), 8),
(11, 'Facultatea de Stiinte si Mediu', ST_SetSRID(ST_MakePoint(28.051510193547042, 45.44733619364721), 4326), 9),
(12, 'Facultatea de Istorie, Filosofie si Teologie', ST_SetSRID(ST_MakePoint(28.052961624476065, 45.44721931561829), 4326), 10),
(13, 'Facultatea de Litere', ST_SetSRID(ST_MakePoint(28.053417751869894, 45.44738043601649), 4326), 5),
(14, 'Facultatea de Drept si Stiinte Administrative', ST_SetSRID(ST_MakePoint(28.053263051320638, 45.447594143617465), 4326), 11),
(15, 'Facultatea de Inginerie (Corp Metalurgie)', ST_SetSRID(ST_MakePoint(28.05228463236714, 45.447612853870154), 4326), 4),
(16, 'Facultatea de Educatie Fizica si Sport', ST_SetSRID(ST_MakePoint(28.04934533704189, 45.443308694605946), 4326), 3),
(17, 'Complex Studentesc 22 Decembrie', ST_SetSRID(ST_MakePoint(28.050693542136212, 45.443269175172155), 4326), NULL),
(18, 'Biblioteca Universitatii', ST_SetSRID(ST_MakePoint(28.05105178829204, 45.44346821009217), 4326), NULL),
(19, 'Facultatea de Economie si Administrarea Afacerilor', ST_SetSRID(ST_MakePoint(28.051631145440105, 45.4434653872849), 4326), 13),
(20, 'FMF - Corpul MG (CDT)', ST_SetSRID(ST_MakePoint(28.05283936104294, 45.44015941845244), 4326), 6),
(21, 'FMF - Corpul MP', ST_SetSRID(ST_MakePoint(28.062068262889525, 45.43242403844191), 4326), 6),
(22, 'FMF - Corpul MF', ST_SetSRID(ST_MakePoint(28.015464015383827, 45.410858015675565), 4326), 6),
(23, 'FMF - Corpul MS', ST_SetSRID(ST_MakePoint(28.05551548377485, 45.44942122836635), 4326), 6),
(24, 'Sala de sport Florin Balais', ST_SetSRID(ST_MakePoint(28.056153845715446, 45.449513007888775), 4326), NULL),
(25, 'Camin E', ST_SetSRID(ST_MakePoint(28.05199171505145, 45.45433761201449), 4326), NULL),
(26, 'Camin J', ST_SetSRID(ST_MakePoint(28.051337777580574, 45.453991483611254), 4326), NULL),
(27, 'Camin A', ST_SetSRID(ST_MakePoint(28.051143808028872, 45.45352474328845), 4326), NULL),
(28, 'Camin B', ST_SetSRID(ST_MakePoint(28.051840745140876, 45.453713022054295), 4326), NULL),
(29, 'Camin F', ST_SetSRID(ST_MakePoint(28.051770825885175, 45.45327001219165), 4326), NULL),
(30, 'Camin G', ST_SetSRID(ST_MakePoint(28.04991673801843, 45.45300665899378), 4326), NULL),
(31, 'Camin D', ST_SetSRID(ST_MakePoint(28.04936833369286, 45.45313923158966), 4326), NULL),
(32, 'Camin H', ST_SetSRID(ST_MakePoint(28.049673552832353, 45.45341465652275), 4326), NULL),
(33, 'Camin C', ST_SetSRID(ST_MakePoint(28.049362979286386, 45.453942185824026), 4326), NULL),
(34, 'Cantina Studenteasca (Campus)', ST_SetSRID(ST_MakePoint(28.048737131910197, 45.453962406325694), 4326), NULL),
(35, 'Casa de Cultura a Studentilor', ST_SetSRID(ST_MakePoint(28.04718963325447, 45.45460878195807), 4326), NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. PRODUCTS
INSERT INTO public.products (id, name, description, quantity, price) VALUES
(1, 'Ciorba de perisoare', 'Ciorba traditionala cu smantana si ardei iute', '400g', 14.50),
(2, 'Ceafa de porc la gratar', 'Ceafa suculenta rumenita pe plita', '150g', 16.00),
(3, 'Cartofi prajiti', 'Cartofi taiati mare, usor condimentati', '200g', 7.00),
(4, 'Salata de rosii cu branza', 'Rosii proaspete si telemea de vaca', '150g', 6.50),
(5, 'Papanasi cu dulceata', 'Doi papanasi cu smantana si dulceata de afine', '250g', 12.00),
(6, 'Ciorba Radauteana', 'Ciorba cu piept de pui, smantana si usturoi', '400g', 15.00),
(7, 'Snitel de pui', 'Piept de pui pane crocant', '150g', 14.00),
(8, 'Piure de cartofi', 'Cartofi proaspeti pasati cu unt si lapte', '200g', 6.00),
(9, 'Salata de varza', 'Varza alba proaspata cu marar', '100g', 3.50),
(10, 'Clatite cu Finetti', 'Portie de 2 clatite proaspete', '150g', 8.00)
ON CONFLICT (id) DO NOTHING;

-- 5. DAILY MENUS
INSERT INTO public.daily_menus (id, day_of_week) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)
ON CONFLICT (id) DO NOTHING;

-- 6. MENU PRODUCTS
INSERT INTO public.menu_products (menu_id, product_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
(2, 6), (2, 7), (2, 8), (2, 9), (2, 10),
(3, 1), (3, 7), (3, 3), (3, 9), (3, 5),
(4, 6), (4, 2), (4, 8), (4, 4), (4, 10),
(5, 1), (5, 6), (5, 7), (5, 3), (5, 5)
ON CONFLICT (menu_id, product_id) DO NOTHING;

-- 7. ANNOUNCEMENTS
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

-- 8. COMPLAINTS
INSERT INTO public.complaints (id, title, description, location_id, status, user_id) VALUES
(1, 'Problema retea Wi-Fi in Biblioteca', 'Semnalul eduroam se intrerupe frecvent la etajul 2 al bibliotecii. Ne ingreuneaza accesul la materiale de studiu.', 7, 'in_lucru', '00000000-0000-0000-0000-000000000002'),
(2, 'Fereastra defecta', 'Geamul termopan nu se mai inchide etans, iar in sala de clasa este foarte frig.', 1, 'in_asteptare', '00000000-0000-0000-0000-000000000005'),
(3, 'Priza topita', 'O priza din stanga tablei are urme de arsura si nu furnizeaza curent.', 6, 'finalizat', '00000000-0000-0000-0000-000000000004'),
(4, 'Lipsa apa calda', 'La etajul 3 din camin apa calda curge foarte greu dimineata.', 5, 'solutionat', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ACTUALIZARE SECVENTE
SELECT setval('public.faculties_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.faculties));
SELECT setval('public.categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.categories));
SELECT setval('public.locations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.locations));
SELECT setval('public.products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.products));
SELECT setval('public.daily_menus_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.daily_menus));
SELECT setval('public.announcements_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.announcements));
SELECT setval('public.complaints_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.complaints));
