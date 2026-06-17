param(
    [string]$DbService = "supabase-db"
)

$ErrorActionPreference = "Stop"

Get-Content -LiteralPath "supabase/post-init/ensure_auth_profile_trigger.sql" -Raw |
    docker compose exec -T $DbService psql `
        -U postgres `
        -d postgres `
        -v ON_ERROR_STOP=1 `
        -f -

if ($LASTEXITCODE -ne 0) {
    Write-Error "Auth post-init SQL failed."
    exit 1
}

Write-Host "OK: auth post-init SQL applied."
