-- Rulează acest script în Supabase Studio > SQL Editor
-- sau via psql înainte de a porni serviciul LLM

CREATE TABLE IF NOT EXISTS public.llm_calls (
    id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at      timestamptz DEFAULT now() NOT NULL,
    function_name   text        NOT NULL,
    model           text        NOT NULL,
    prompt_tokens   integer     DEFAULT 0,
    response_tokens integer     DEFAULT 0,
    total_tokens    integer     DEFAULT 0,
    cached          boolean     DEFAULT false,
    duration_ms     integer
);

-- Index pentru filtrare rapidă după funcție și dată
CREATE INDEX IF NOT EXISTS idx_llm_calls_function ON public.llm_calls (function_name);
CREATE INDEX IF NOT EXISTS idx_llm_calls_created  ON public.llm_calls (created_at DESC);
