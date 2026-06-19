-- Migratie pentru a adauga coloanele explicite in smart_news_chunks 
-- si pentru a returna aceste coloane in functia de similaritate

ALTER TABLE smart_news_chunks 
  ADD COLUMN IF NOT EXISTS entitate_sursa text,
  ADD COLUMN IF NOT EXISTS urgenta_estimata text,
  ADD COLUMN IF NOT EXISTS deadline_absolut timestamp with time zone,
  ADD COLUMN IF NOT EXISTS locatie text;

DROP FUNCTION IF EXISTS match_smart_news_chunks(vector, integer);

CREATE OR REPLACE FUNCTION match_smart_news_chunks (
  query_embedding vector(384),
  match_count int default 5
) RETURNS TABLE (
  id uuid,
  original_text text,
  materie_sau_subiect text,
  entitate_sursa text,
  tip_eveniment text,
  urgenta_estimata text,
  rezumat_notificare text,
  public_tinta text[],
  deadline_absolut timestamp with time zone,
  locatie text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $func$
BEGIN
  RETURN QUERY
  SELECT
    smart_news_chunks.id,
    smart_news_chunks.original_text,
    smart_news_chunks.materie_sau_subiect,
    smart_news_chunks.entitate_sursa,
    smart_news_chunks.tip_eveniment,
    smart_news_chunks.urgenta_estimata,
    smart_news_chunks.rezumat_notificare,
    smart_news_chunks.public_tinta,
    smart_news_chunks.deadline_absolut,
    smart_news_chunks.locatie,
    smart_news_chunks.metadata,
    1 - (smart_news_chunks.embedding <=> query_embedding) AS similarity
  FROM smart_news_chunks
  ORDER BY smart_news_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$func$;
