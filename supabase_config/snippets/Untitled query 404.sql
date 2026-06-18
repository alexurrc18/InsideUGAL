-- 1. Activăm extensia pentru vectori
create extension if not exists vector;

-- 2. Creăm tabela care va înlocui ChromaDB
create table if not exists document_chunks (
  id bigserial primary key,
  pdf_id uuid not null,
  content text not null,
  embedding vector(384) 
);

-- 3. Adăugăm un index pentru căutări ultra-rapide
create index if not exists document_chunks_embedding_idx on document_chunks using hnsw (embedding vector_cosine_ops);

-- 4. Creăm o funcție (RPC) pentru a căuta similarități din Python
create or replace function match_document_chunks (
  query_embedding vector(384),
  match_count int DEFAULT 5,
  filter_pdf_id uuid DEFAULT null
) returns table (
  id bigint,
  pdf_id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.pdf_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where filter_pdf_id is null or document_chunks.pdf_id = filter_pdf_id
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. Forțăm API-ul Supabase să memoreze noua funcție
NOTIFY pgrst, 'reload schema';
