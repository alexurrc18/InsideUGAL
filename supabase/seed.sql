
-- ==========================================================
-- InsideUGAL seed data
-- ==========================================================

-- ==========================================================
-- FACULTIES
-- ==========================================================

INSERT INTO public.faculties (
    name,
    abbreviation,
    website_url,
    dormitory_url,
    description
)
VALUES
(
    'Facultatea de Automatica, Calculatoare, Inginerie Electrica si Electronica',
    'ACIEE',
    'https://aciee.ugal.ro',
    'https://ugal.ro/studenti/camine-si-cantine',
    'Facultate tehnica orientata pe automatica, calculatoare si electronica.'
),
(
    'Facultatea de Inginerie',
    'ING',
    'https://ing.ugal.ro',
    'https://ugal.ro/studenti/camine-si-cantine',
    'Facultate dedicata domeniilor ingineresti si industriale.'
),
(
    'Facultatea de Economie si Administrarea Afacerilor',
    'FEAA',
    'https://feaa.ugal.ro',
    'https://ugal.ro/studenti/camine-si-cantine',
    'Facultate specializata in economie si administrarea afacerilor.'
)
ON CONFLICT (abbreviation) DO NOTHING;

-- ==========================================================
-- LOCATIONS
-- ==========================================================

INSERT INTO public.locations (
    name,
    address,
    coordinates,
    faculty_id
)
VALUES
(
    'Campus ACIEE',
    'Strada Domneasca 111, Galati',
    ST_SetSRID(ST_MakePoint(28.0456, 45.4353), 4326),
    (SELECT id FROM public.faculties WHERE abbreviation = 'ACIEE')
),
(
    'Cantina Studenteasca',
    'Strada Domneasca 155, Galati',
    ST_SetSRID(ST_MakePoint(28.0480, 45.4370), 4326),
    NULL
),
(
    'Facultatea de Inginerie',
    'Strada Domneasca 47, Galati',
    ST_SetSRID(ST_MakePoint(28.0420, 45.4381), 4326),
    (SELECT id FROM public.faculties WHERE abbreviation = 'ING')
)
ON CONFLICT DO NOTHING;

-- ==========================================================
-- CAFETERIA MENUS
-- ==========================================================

INSERT INTO public.cafeteria_menus (
    name,
    price,
    description,
    proteins,
    fats,
    carbohydrates,
    calories,
    grams,
    day_of_week,
    is_available
)
VALUES
(
    'Piept de pui cu orez',
    18.50,
    'Piept de pui la gratar cu garnitura de orez.',
    32.5,
    10.2,
    45.8,
    520,
    450,
    1,
    TRUE
),
(
    'Paste Carbonara',
    22.00,
    'Paste cu sos carbonara si bacon.',
    20.0,
    18.5,
    60.0,
    680,
    500,
    2,
    TRUE
),
(
    'Ciorba de legume',
    10.00,
    'Ciorba proaspata de legume.',
    5.0,
    3.0,
    15.0,
    180,
    350,
    3,
    TRUE
)
ON CONFLICT DO NOTHING;

-- ==========================================================
-- TEST USERS AUTH
-- Triggerul on_auth_user_created creaza automat profilul
-- ==========================================================

INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
)
VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'student@insideugal.ro',
    crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Student Demo"}',
    FALSE,
    'authenticated'
),
(
    '22222222-2222-2222-2222-222222222222',
    'admin@insideugal.ro',
    crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin Demo"}',
    FALSE,
    'authenticated'
),
(
    '33333333-3333-3333-3333-333333333333',
    'profesor@insideugal.ro',
    crypt('password123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Profesor Demo"}',
    FALSE,
    'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Updateaza rolurile (triggerul creaza profilul cu rol default STUDENT)
UPDATE public.profiles SET role = 'ADMIN'    WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET role = 'PROFESOR' WHERE id = '33333333-3333-3333-3333-333333333333';

-- ==========================================================
-- COMPLAINTS
-- ==========================================================

INSERT INTO public.complaints (
    user_id,
    location_id,
    title,
    description,
    image_url,
    status
)
VALUES
(
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM public.locations WHERE name = 'Campus ACIEE' LIMIT 1),
    'Lumina defecta pe hol',
    'Becul de pe etajul 2 nu functioneaza.',
    NULL,
    'NEW'
),
(
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM public.locations WHERE name = 'Cantina Studenteasca' LIMIT 1),
    'Masa deteriorata',
    'Una dintre mesele din cantina este rupta.',
    NULL,
    'IN_PROGRESS'
)
ON CONFLICT DO NOTHING;

-- ==========================================================
-- ANNOUNCEMENTS
-- ==========================================================

INSERT INTO public.announcements (
    title,
    content,
    category,
    image_url,
    is_event,
    start_date,
    end_date,
    location_name,
    target_audience,
    send_push,
    created_by
)
VALUES
(
    'Deschiderea noului laborator',
    'Va invitam la inaugurarea noului laborator de electronica.',
    'Academic',
    NULL,
    TRUE,
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '3 days 2 hours',
    'Campus ACIEE',
    'STUDENTI',
    TRUE,
    '33333333-3333-3333-3333-333333333333'
),
(
    'Program cantina',
    'Cantina va functiona intre orele 08:00 - 20:00.',
    'Administrativ',
    NULL,
    FALSE,
    NULL,
    NULL,
    NULL,
    'ALL',
    FALSE,
    '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT DO NOTHING;
