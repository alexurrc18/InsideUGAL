-- Fix RLS permissions for cache tables to allow service_role access
ALTER TABLE public.llm_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "service_role_access" ON public.llm_cache;
DROP POLICY IF EXISTS "service_role_access" ON public.semantic_cache;

-- Create policies for service_role access
CREATE POLICY "service_role_access" ON public.llm_cache 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_access" ON public.semantic_cache 
    FOR ALL TO service_role USING (true) WITH CHECK (true);
