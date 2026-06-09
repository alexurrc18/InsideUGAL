-- Tabel pentru chunk-urile chatbotului FACIEE (RAG pe Supabase pgvector)
create table if not exists chatbot_chunks (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  source    text not null default '',
  type      text not null default 'file',
  embedding vector(384)
);

alter table chatbot_chunks enable row level security;

create index on chatbot_chunks using hnsw (embedding vector_cosine_ops);

create or replace function match_chatbot_chunks (
  query_embedding vector(384),
  match_count     int default 5
) returns table (
  id         bigint,
  chunk_id   text,
  content    text,
  source     text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    chatbot_chunks.id,
    chatbot_chunks.chunk_id,
    chatbot_chunks.content,
    chatbot_chunks.source,
    1 - (chatbot_chunks.embedding <=> query_embedding) as similarity
  from chatbot_chunks
  order by chatbot_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
