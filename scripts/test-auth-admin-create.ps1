param(
    [string]$Email = "admin@ugal.ro",
    [string]$Password = "ParolaTemporara123!"
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
    Write-Error $Message
    exit 1
}

$envPath = ".env"
if (-not (Test-Path -LiteralPath $envPath)) {
    Fail "Nu exista .env"
}

$values = @{}
Get-Content -LiteralPath $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
        return
    }
    $parts = $line.Split("=", 2)
    if ($parts.Count -eq 2) {
        $values[$parts[0].Trim()] = $parts[1].Trim()
    }
}

$url = $values["SUPABASE_AUTH_URL"]
if (-not $url) {
    $url = "http://localhost:8004/auth/v1"
}
$url = $url.TrimEnd("/")
$serviceKey = $values["SUPABASE_SERVICE_ROLE_KEY"]
if (-not $serviceKey) {
    Fail "Lipseste SUPABASE_SERVICE_ROLE_KEY in .env"
}

$body = @{
    email = $Email
    password = $Password
    email_confirm = $true
    user_metadata = @{
        first_name = "Admin"
        last_name = "UGAL"
        username = "admin"
    }
} | ConvertTo-Json -Depth 5

try {
    $response = Invoke-WebRequest `
        -Uri "$url/admin/users" `
        -Method Post `
        -Headers @{
            apikey = $serviceKey
            Authorization = "Bearer $serviceKey"
            "Content-Type" = "application/json"
        } `
        -Body $body `
        -UseBasicParsing

    Write-Host "OK: Admin API a creat userul sau a raspuns cu succes."
    Write-Host $response.Content
} catch {
    if ($_.Exception.Response) {
        $reader = [IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $content = $reader.ReadToEnd()
        Write-Host "Status: $([int]$_.Exception.Response.StatusCode) $($_.Exception.Response.StatusDescription)"
        Write-Host "Response:"
        Write-Host $content
    }
    Fail "Admin API create user a esuat."
}
