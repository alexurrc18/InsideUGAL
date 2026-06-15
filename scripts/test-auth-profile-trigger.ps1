param(
    [string]$DbService = "supabase-db"
)

$ErrorActionPreference = "Stop"

Get-Content -LiteralPath "scripts/test-auth-profile-trigger.sql" -Raw |
    docker compose exec -T $DbService psql `
        -U postgres `
        -d postgres `
        -v ON_ERROR_STOP=1 `
        -f -

if ($LASTEXITCODE -ne 0) {
    Write-Error "Auth profile trigger SQL test failed."
    exit 1
}

Write-Host "OK: auth.users -> public.profiles trigger test passed."
