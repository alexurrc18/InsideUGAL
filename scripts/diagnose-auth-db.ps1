param(
    [string]$DbService = "supabase-db"
)

$ErrorActionPreference = "Stop"

Get-Content -LiteralPath "scripts/diagnose-auth-db.sql" -Raw |
    docker compose exec -T $DbService psql `
        -U postgres `
        -d postgres `
        -v ON_ERROR_STOP=1 `
        -f -

if ($LASTEXITCODE -ne 0) {
    Write-Error "Auth DB diagnostics failed."
    exit 1
}
