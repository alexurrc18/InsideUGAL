-- Rulează în Supabase Studio > SQL Editor înainte de a porni serviciul LLM

CREATE TABLE IF NOT EXISTS public.questions_history (
    id          bigserial   PRIMARY KEY,
    created_at  timestamptz DEFAULT now() NOT NULL,
    pdf_id      text        NOT NULL,
    question    text        NOT NULL,
    answer      text        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qh_pdf_id    ON public.questions_history (pdf_id);
CREATE INDEX IF NOT EXISTS idx_qh_created   ON public.questions_history (created_at DESC);
