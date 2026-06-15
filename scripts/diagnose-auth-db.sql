SELECT 'max_connections' AS check_name, current_setting('max_connections') AS value;

SELECT 'active_connections' AS check_name, count(*)::text AS value
FROM pg_stat_activity;

SELECT
    'role_flags' AS check_name,
    rolname || ' login=' || rolcanlogin || ' superuser=' || rolsuper || ' createrole=' || rolcreaterole || ' bypassrls=' || rolbypassrls AS value
FROM pg_roles
WHERE rolname IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'authenticator', 'anon', 'authenticated', 'service_role')
ORDER BY rolname;

SELECT
    'auth_schema_usage_supabase_auth_admin' AS check_name,
    has_schema_privilege('supabase_auth_admin', 'auth', 'USAGE')::text AS value;

SELECT
    'public_schema_usage_supabase_auth_admin' AS check_name,
    has_schema_privilege('supabase_auth_admin', 'public', 'USAGE')::text AS value;

SELECT
    'auth_users_privileges' AS check_name,
    privilege_type AS value
FROM information_schema.role_table_grants
WHERE grantee = 'supabase_auth_admin'
  AND table_schema = 'auth'
  AND table_name = 'users'
ORDER BY privilege_type;

SELECT
    'profiles_privileges' AS check_name,
    privilege_type AS value
FROM information_schema.role_table_grants
WHERE grantee = 'supabase_auth_admin'
  AND table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY privilege_type;

SELECT
    'auth_users_exists' AS check_name,
    (to_regclass('auth.users') IS NOT NULL)::text AS value;

SELECT
    'profile_trigger_exists' AS check_name,
    EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    )::text AS value;
