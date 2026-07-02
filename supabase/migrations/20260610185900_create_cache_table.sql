CREATE TABLE IF NOT EXISTS llm_cache (
    cache_key TEXT PRIMARY KEY,
    response TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE public.llm_cache ENABLE ROW LEVEL SECURITY;

