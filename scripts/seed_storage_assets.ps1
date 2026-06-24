$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root ".env"

if (-not (Test-Path -LiteralPath $envPath)) {
    throw ".env not found at $envPath"
}

$envValues = @{}
Get-Content -LiteralPath $envPath | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -notmatch "=") {
        return
    }
    $key, $value = $_ -split "=", 2
    $envValues[$key.Trim()] = $value.Trim()
}

$supabaseUrl = $envValues["SUPABASE_PUBLIC_URL"]
if (-not $supabaseUrl) {
    $supabaseUrl = $envValues["SUPABASE_URL"]
}
if (-not $supabaseUrl) {
    $supabaseUrl = "http://localhost:8004"
}
$supabaseUrl = $supabaseUrl.TrimEnd("/")

$serviceKey = $envValues["SUPABASE_SERVICE_ROLE_KEY"]
if (-not $serviceKey) {
    throw "SUPABASE_SERVICE_ROLE_KEY is missing from .env"
}

function Send-StorageObject {
    param(
        [Parameter(Mandatory=$true)][string]$Bucket,
        [Parameter(Mandatory=$true)][string]$ObjectName,
        [Parameter(Mandatory=$true)][string]$FilePath,
        [Parameter(Mandatory=$true)][string]$ContentType
    )

    if (-not (Test-Path -LiteralPath $FilePath)) {
        Write-Host "skip missing $FilePath"
        return
    }

    $uri = "$supabaseUrl/storage/v1/object/$Bucket/$ObjectName"
    Write-Host "upload $Bucket/$ObjectName"
    curl.exe --fail --silent --show-error --request POST `
        --url $uri `
        --header "apikey: $serviceKey" `
        --header "Authorization: Bearer $serviceKey" `
        --header "Content-Type: $ContentType" `
        --header "x-upsert: true" `
        --data-binary "@$FilePath" | Out-Null
}

Send-StorageObject -Bucket "images" -ObjectName "universitate.jpg" -FilePath (Join-Path $root "assets\universitate.jpg") -ContentType "image/jpeg"
Send-StorageObject -Bucket "images" -ObjectName "uggal.jpg" -FilePath (Join-Path $root "Frontend\Dashboard\dashboard-insideugal\public\uggal.jpg") -ContentType "image/jpeg"
Send-StorageObject -Bucket "images" -ObjectName "campus-stiintei.png" -FilePath (Join-Path $root "Frontend\Mobile\assets\images\campus-stiintei.png") -ContentType "image/png"
Send-StorageObject -Bucket "images" -ObjectName "placeholders/1920x1080.png" -FilePath (Join-Path $root "Frontend\Mobile\assets\images\placeholders\1920x1080.png") -ContentType "image/png"
Send-StorageObject -Bucket "images" -ObjectName "placeholders/500x500.png" -FilePath (Join-Path $root "Frontend\Mobile\assets\images\placeholders\500x500.png") -ContentType "image/png"

Send-StorageObject -Bucket "faculty-logos" -ObjectName "ugal-logo.png" -FilePath (Join-Path $root "Frontend\Dashboard\dashboard-insideugal\public\logo_alb.png") -ContentType "image/png"
Send-StorageObject -Bucket "faculty-logos" -ObjectName "mobile-logo.png" -FilePath (Join-Path $root "Frontend\Mobile\assets\images\logo.png") -ContentType "image/png"

Send-StorageObject -Bucket "documents" -ObjectName "Regulament_Camine_UGAL.pdf" -FilePath (Join-Path $root "LLM\src\modul-marius\pdfs\Regulament_Camine_UGAL.pdf") -ContentType "application/pdf"
Write-Host "storage assets seeded"
