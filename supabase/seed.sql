


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
-- TEST USERS PROFILES
-- IMPORTANT:
-- Aceste INSERT-uri functioneaza doar daca utilizatorii exista
-- deja in auth.users.
-- ==========================================================

--INSERT INTO public.profiles (
   -- id,
   -- email,
   -- full_name,
   -- role,
   -- is_active
--)
--VALUES
--(
    --'11111111-1111-1111-1111-111111111111',
   -- 'student@insideugal.ro',
   -- 'Student Demo',
    --'STUDENT',
    --TRUE
--),
--(
  --  '22222222-2222-2222-2222-222222222222',
    --'admin@insideugal.ro',
    --'Admin Demo',
    --'ADMIN',
    --TRUE
--),
--(
  --  '33333333-3333-3333-3333-333333333333',
  --  'profesor@insideugal.ro',
    --'Profesor Demo',
    --'PROFESOR',
    --TRUE
--)
--ON CONFLICT (id) DO NOTHING;

-- ==========================================================
-- COMPLAINTS

-- ANNOUNCEMENTS