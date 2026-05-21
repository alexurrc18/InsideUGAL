 -- 1. Activează PostGIS pentru hartă
     create extension if not exists postgis;
    
    -- 2. Tabelul pentru Profiluri (legat de Auth)
     create table public.profiles (
       id uuid references auth.users on delete cascade primary key,
       student_id text unique,
       full_name text,
      role text check (role in ('student', 'admin')) default 'student',
      updated_at timestamp with time zone default timezone('utc'::text, now())
    );
   
    -- 3. Tabelul pentru Locații (Harta Campusului)
    create table public.locations (
      id bigint generated always as identity primary key,
      name text not null,
      type text check (type in ('facultate', 'camin', 'cantina', 'altul')),
      coordinates geometry(Point, 4326), -- Tip special pentru hartă
     description text
    );
   
    -- 4. Tabelul pentru Meniu Cantină
    create table public.cafeteria_menus (
      id bigint generated always as identity primary key,
     day date default current_date,
      item_name text not null,
      calories int,
      price decimal(10,2)
    );
   
    -- Activează Row Level Security (RLS)
    alter table public.profiles enable row level security;
    alter table public.locations enable row level security;