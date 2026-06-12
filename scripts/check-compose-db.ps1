param(
    [string]$DbService = "supabase-db"
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
    Write-Error $Message
    exit 1
}

function Invoke-Db([string]$Sql) {
    docker compose exec -T $DbService psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atc $Sql
    if ($LASTEXITCODE -ne 0) {
        Fail "Comanda SQL a esuat."
    }
}

$health = docker compose ps --format json $DbService 2>$null | ConvertFrom-Json
if (-not $health) {
    Fail "Serviciul $DbService nu exista sau docker compose nu ruleaza."
}
if ($health.Health -ne "healthy") {
    Fail "$DbService nu este healthy. Ruleaza: docker compose logs --no-color $DbService"
}

$expectedTables = @(
    "profiles",
    "faculties",
    "categories",
    "locations",
    "products",
    "daily_menus",
    "menu_products",
    "announcements",
    "complaints",
    "llm_calls",
    "questions_history",
    "document_chunks",
    "chatbot_chunks",
    "llm_cache"
)

$existingTables = Invoke-Db "select tablename from pg_tables where schemaname = 'public' order by tablename;"
$existingSet = @{}
foreach ($table in $existingTables) {
    if ($table) {
        $existingSet[$table] = $true
    }
}

foreach ($table in $expectedTables) {
    if (-not $existingSet.ContainsKey($table)) {
        Fail "Lipseste tabela public.$table"
    }
}

$minimumRows = @{
    profiles = 5
    faculties = 6
    categories = 6
    locations = 8
    products = 10
    daily_menus = 5
    menu_products = 25
    announcements = 8
    complaints = 4
}

Write-Host "Tabele public si numar de randuri:"
foreach ($table in $expectedTables) {
    $count = [int](Invoke-Db "select count(*) from public.$table;")
    "{0,-20} {1,5}" -f $table, $count

    if ($minimumRows.ContainsKey($table) -and $count -lt $minimumRows[$table]) {
        Fail "Tabela public.$table are $count randuri, asteptat minim $($minimumRows[$table])."
    }
}

Write-Host "OK: tabelele asteptate exista, iar seed data pentru API este prezenta."
