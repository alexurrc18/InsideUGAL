-- Stergem tabela smart_news_chunks si obiectele asociate.
-- Motivare: Datele anunturilor sunt stocate in tabela principala "announcements"
-- (gestionata de backend), iar cache-ul LLM este acum acoperit de tabela "llm_cache"
-- din shared/supabase_cache.py. Nu exista niciun consumator activ al acestei tabele.

DROP FUNCTION IF EXISTS match_smart_news_chunks(vector, integer);
DROP TABLE IF EXISTS smart_news_chunks;
