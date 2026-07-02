create table if not exists public.semantic_cache (
    id bigserial primary key,
    question text not null,
    embedding vector(3072) not null,
    answer text not null,
    created_at timestamptz default now()
);

alter table public.semantic_cache enable row level security;
revoke all privileges on table public.semantic_cache from authenticated, anon;


