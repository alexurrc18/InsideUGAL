-- Funcție RPC pentru căutare semantică eficientă în cache
-- Folosită de LLMOptimizer.get_cached_answer() în loc de scan O(n)
create or replace function match_semantic_cache(
  query_embedding vector(384),
  match_threshold float default 0.95,
  match_count int default 1
)
returns table (
  question text,
  answer text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    sc.question,
    sc.answer,
    1 - (sc.embedding <=> query_embedding) as similarity
  from semantic_cache sc
  where 1 - (sc.embedding <=> query_embedding) >= match_threshold
  order by sc.embedding <=> query_embedding
  limit match_count;
end;
$$;
