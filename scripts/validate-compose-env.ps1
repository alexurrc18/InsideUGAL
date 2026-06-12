param(
    [string]$EnvPath = ".env"
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
    Write-Error $Message
    exit 1
}

function Read-EnvFile([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        Fail "Nu exista fisierul env: $Path"
    }

    $values = @{}
    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $parts = $line.Split("=", 2)
        if ($parts.Count -ne 2) {
            Fail "Linie invalida in ${Path}: $line"
        }

        $values[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
    }

    return $values
}

function ConvertFrom-Base64Url([string]$Value) {
    $padded = $Value.Replace("-", "+").Replace("_", "/")
    while ($padded.Length % 4 -ne 0) {
        $padded += "="
    }
    return [Convert]::FromBase64String($padded)
}

function Get-JwtPayload([string]$Jwt) {
    $parts = $Jwt.Split(".")
    if ($parts.Count -ne 3) {
        Fail "JWT invalid: trebuie sa aiba 3 parti."
    }

    $json = [Text.Encoding]::UTF8.GetString((ConvertFrom-Base64Url $parts[1]))
    return $json | ConvertFrom-Json
}

function Test-Hs256Jwt([string]$Jwt, [string]$Secret, [string]$ExpectedRole, [string]$Name) {
    $parts = $Jwt.Split(".")
    if ($parts.Count -ne 3) {
        Fail "$Name nu este JWT valid."
    }

    $headerJson = [Text.Encoding]::UTF8.GetString((ConvertFrom-Base64Url $parts[0]))
    $header = $headerJson | ConvertFrom-Json
    if ($header.alg -ne "HS256") {
        Fail "$Name trebuie sa foloseasca alg=HS256, gasit: $($header.alg)"
    }

    $payload = Get-JwtPayload $Jwt
    if ($payload.role -ne $ExpectedRole) {
        Fail "$Name trebuie sa aiba role=$ExpectedRole, gasit: $($payload.role)"
    }

    $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    if ($payload.exp -and [int64]$payload.exp -le $now) {
        Fail "$Name este expirat."
    }

    $hmac = [Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($Secret))
    $signatureBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes("$($parts[0]).$($parts[1])"))
    $signature = [Convert]::ToBase64String($signatureBytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
    if ($signature -ne $parts[2]) {
        Fail "$Name nu este semnat cu SUPABASE_JWT_SECRET din .env."
    }
}

$envValues = Read-EnvFile $EnvPath

$required = @(
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_PORT",
    "DATABASE_URL",
    "SUPABASE_AUTH_URL",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_JWT_SECRET",
    "NEXT_PUBLIC_BACKEND_URL",
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "ALLOWED_ORIGINS"
)

foreach ($key in $required) {
    if (-not $envValues.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envValues[$key])) {
        Fail "Lipseste sau este gol: $key"
    }
}

foreach ($key in $envValues.Keys) {
    if ($envValues[$key] -match "\$\{.+\}") {
        Fail "$key contine o referinta nerezolvata: $($envValues[$key])"
    }
}

if ($envValues["POSTGRES_DB"] -ne "postgres") { Fail "POSTGRES_DB trebuie sa fie postgres pentru compose local." }
if ($envValues["POSTGRES_USER"] -ne "postgres") { Fail "POSTGRES_USER trebuie sa fie postgres pentru compose local." }
if ($envValues["POSTGRES_PORT"] -ne "5432") { Fail "POSTGRES_PORT trebuie sa fie 5432 pentru compose local." }

if ($envValues["SUPABASE_URL"] -ne "http://localhost:8004") {
    Fail "SUPABASE_URL din .env trebuie sa fie http://localhost:8004. In containere Compose il suprascrie la http://supabase-kong:8000."
}
if ($envValues["SUPABASE_AUTH_URL"] -ne "http://localhost:8004/auth/v1") {
    Fail "SUPABASE_AUTH_URL trebuie sa fie http://localhost:8004/auth/v1."
}
if ($envValues["NEXT_PUBLIC_SUPABASE_URL"] -ne "http://localhost:8004") {
    Fail "NEXT_PUBLIC_SUPABASE_URL trebuie sa fie http://localhost:8004."
}
if ($envValues["NEXT_PUBLIC_BACKEND_URL"] -ne "http://localhost:8002") {
    Fail "NEXT_PUBLIC_BACKEND_URL trebuie sa fie http://localhost:8002."
}
if ($envValues["NEXT_PUBLIC_API_URL"] -ne "http://localhost:8002") {
    Fail "NEXT_PUBLIC_API_URL trebuie sa fie http://localhost:8002."
}

if ($envValues["SUPABASE_SERVICE_KEY"] -ne $envValues["SUPABASE_SERVICE_ROLE_KEY"]) {
    Fail "SUPABASE_SERVICE_KEY trebuie sa fie identic cu SUPABASE_SERVICE_ROLE_KEY."
}
if ($envValues["NEXT_PUBLIC_SUPABASE_ANON_KEY"] -ne $envValues["SUPABASE_ANON_KEY"]) {
    Fail "NEXT_PUBLIC_SUPABASE_ANON_KEY trebuie sa fie identic cu SUPABASE_ANON_KEY."
}

if ($envValues["SUPABASE_JWT_SECRET"].Length -lt 32) {
    Fail "SUPABASE_JWT_SECRET trebuie sa aiba minim 32 caractere."
}

Test-Hs256Jwt $envValues["SUPABASE_ANON_KEY"] $envValues["SUPABASE_JWT_SECRET"] "anon" "SUPABASE_ANON_KEY"
Test-Hs256Jwt $envValues["SUPABASE_SERVICE_ROLE_KEY"] $envValues["SUPABASE_JWT_SECRET"] "service_role" "SUPABASE_SERVICE_ROLE_KEY"

Write-Host "OK: .env este valid pentru docker compose local."
