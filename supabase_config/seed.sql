INSERT INTO public.profiles (id, username, first_name, last_name, email, role, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'admin_seed', 'Admin', 'Seed', 'admin.seed@ugal.ro', 'HEAD_ADMIN', true),
('00000000-0000-0000-0000-000000000002', 'student_demo', 'Student', 'Demo', 'student@ugal.ro', 'STUDENT', true),
('00000000-0000-0000-0000-000000000003', 'prof_popescu', 'Ion', 'Popescu', 'ion.popescu@ugal.ro', 'PROFESOR', true),
('00000000-0000-0000-0000-000000000004', 'resp_camin', 'Andrei', 'Vasile', 'andrei.vasile@ugal.ro', 'STUDENT_RESPONSABIL', true),
('00000000-0000-0000-0000-000000000005', 'maria_ionescu', 'Maria', 'Ionescu', 'maria.ionescu@ugal.ro', 'STUDENT', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.faculties (id, name, abbreviation, address, phone, website_url) VALUES
(1, 'Facultatea de Automatica, Calculatoare, Inginerie Electrica si Electronica', 'ACIEE', 'Str. Stiintei nr. 2', '0236412345', 'https://aciee.ugal.ro'),
(2, 'Facultatea de Arhitectura Navala', 'FAN', 'Str. Domneasca nr. 47', '0236412346', 'https://naoe.ugal.ro'),
(3, 'Facultatea de Educatie Fizica si Sport', 'FEFS', 'Str. Garii nr. 63', '0236412347', 'https://fefs.ugal.ro'),
(4, 'Facultatea de Inginerie', 'ING', 'Str. Domneasca nr. 111', '0236412348', 'https://ing.ugal.ro'),
(5, 'Facultatea de Litere', 'LIT', 'Str. Domneasca nr. 47', '0236412349', 'https://lit.ugal.ro'),
(6, 'Facultatea de Medicina si Farmacie', 'FMF', 'Str. Al. Ivanov nr. 1A', '0236412350', 'https://med.ugal.ro')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name) VALUES
(1, 'Burse si Ajutoare'),
(2, 'Oportunitati de Cariera'),
(3, 'Sport si Competitii'),
(4, 'Administrativ'),
(5, 'Evenimente Studentesti'),
(6, 'Practica si Laboratoare')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.locations (id, name, coordinates, faculty_id) VALUES
(1, 'Corpul D (Sali Laborator)', ST_SetSRID(ST_MakePoint(28.0552, 45.4361), 4326), 1),
(2, 'Corpul G (Nave)', ST_SetSRID(ST_MakePoint(28.0531, 45.4370), 4326), 2),
(3, 'Bazinul de Inot UGAL', ST_SetSRID(ST_MakePoint(28.0510, 45.4385), 4326), 3),
(4, 'Cantina Centrala', ST_SetSRID(ST_MakePoint(28.0500, 45.4350), 4326), NULL),
(5, 'Campus LSG (Camine)', ST_SetSRID(ST_MakePoint(28.0490, 45.4340), 4326), NULL),
(6, 'Corpul V', ST_SetSRID(ST_MakePoint(28.0530, 45.4400), 4326), 4),
(7, 'Biblioteca Centrala UGAL', ST_SetSRID(ST_MakePoint(28.0540, 45.4375), 4326), NULL),
(8, 'Corpul M (Medicina)', ST_SetSRID(ST_MakePoint(28.0450, 45.4300), 4326), 6)
ON CONFLICT (id) DO NOTHING;

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

INSERT INTO public.daily_menus (id, day_of_week) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_products (menu_id, product_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
(2, 6), (2, 7), (2, 8), (2, 9), (2, 10),
(3, 1), (3, 7), (3, 3), (3, 9), (3, 5),
(4, 6), (4, 2), (4, 8), (4, 4), (4, 10),
(5, 1), (5, 6), (5, 7), (5, 3), (5, 5)
ON CONFLICT (menu_id, product_id) DO NOTHING;

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

INSERT INTO public.complaints (id, title, description, location_id, status, user_id) VALUES
(1, 'Problema retea Wi-Fi in Biblioteca', 'Semnalul eduroam se intrerupe frecvent la etajul 2 al bibliotecii. Ne ingreuneaza accesul la materiale de studiu.', 7, 'in_lucru', '00000000-0000-0000-0000-000000000002'),
(2, 'Fereastra defecta', 'Geamul termopan nu se mai inchide etans, iar in sala de clasa este foarte frig.', 1, 'in_asteptare', '00000000-0000-0000-0000-000000000005'),
(3, 'Priza topita', 'O priza din stanga tablei are urme de arsura si nu furnizeaza curent.', 6, 'finalizat', '00000000-0000-0000-0000-000000000004'),
(4, 'Lipsa apa calda', 'La etajul 3 din camin apa calda curge foarte greu dimineata.', 5, 'solutionat', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.faculties_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.faculties));
SELECT setval('public.categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.categories));
SELECT setval('public.locations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.locations));
SELECT setval('public.products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.products));
SELECT setval('public.daily_menus_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.daily_menus));
SELECT setval('public.announcements_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.announcements));
SELECT setval('public.complaints_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.complaints));