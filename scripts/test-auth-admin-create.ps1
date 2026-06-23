param(
    [string]$Email = "admin@ugal.ro",
    [string]$Password = "ParolaTemporara123!",
    [switch]$Direct
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
if ($Direct) {
    $url = "http://localhost:9999"
}
$url = $url.TrimEnd("/")
$serviceKey = $values["SUPABASE_SERVICE_ROLE_KEY"]
if (-not $serviceKey) {
    Fail "Lipseste SUPABASE_SERVICE_ROLE_KEY in .env"
}

function ConvertFrom-Base64Url([string]$Value) {
    $padded = $Value.Replace("-", "+").Replace("_", "/")
    while ($padded.Length % 4 -ne 0) {
        $padded += "="
    }
    return [Convert]::FromBase64String($padded)
}

$jwtParts = $serviceKey.Split(".")
if ($jwtParts.Count -eq 3) {
    $payloadJson = [Text.Encoding]::UTF8.GetString((ConvertFrom-Base64Url $jwtParts[1]))
    Write-Host "Service JWT payload:"
    Write-Host $payloadJson
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
    Write-Host "POST $url/admin/users"
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
        $statusCode = [int]$_.Exception.Response.StatusCode
        $statusDescription = $_.Exception.Response.StatusDescription
        $headers = $_.Exception.Response.Headers
        $reader = [IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $content = $reader.ReadToEnd()
        Write-Host "Status: $statusCode $statusDescription"
        Write-Host "Headers:"
        $headers.AllKeys | ForEach-Object { Write-Host ("{0}: {1}" -f $_, $headers[$_]) }
        Write-Host "Response length: $($content.Length)"
        Write-Host "Response:"
        if ($content) {
            Write-Host $content
        } else {
            Write-Host "<empty>"
        }
    }
    Fail "Admin API create user a esuat."
}
