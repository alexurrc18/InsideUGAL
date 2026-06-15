create table if not exists public.semantic_cache (
    id bigserial primary key,
    question text not null,
    embedding vector(3072) not null,
    answer text not null,
    created_at timestamptz default now()
);
