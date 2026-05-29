-- Rulează în Supabase Studio > SQL Editor înainte de a porni serviciul LLM

CREATE TABLE IF NOT EXISTS public.quiz_scores (
    id          bigserial   PRIMARY KEY,
    created_at  timestamptz DEFAULT now() NOT NULL,
    pdf_id      text        NOT NULL,
    correct     integer     NOT NULL,
    total       integer     NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qs_pdf_id  ON public.quiz_scores (pdf_id);
CREATE INDEX IF NOT EXISTS idx_qs_created ON public.quiz_scores (created_at DESC);
