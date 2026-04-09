param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl,

    [switch]$IncludeUat
)

$ErrorActionPreference = "Stop"

function Run-SqlFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string]$DbUrl
    )

    if (-not (Test-Path -LiteralPath $FilePath)) {
        throw "SQL file not found: $FilePath"
    }

    Write-Host "Running $FilePath"
    & psql "$DbUrl" -v ON_ERROR_STOP=1 -f "$FilePath"
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed for file: $FilePath"
    }
}

$migrationsPath = Join-Path $PSScriptRoot "..\..\supabase\migrations"
$sqlPath = Join-Path $PSScriptRoot "..\..\supabase\sql"

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw "psql is not installed or not in PATH"
}

Write-Host "Applying migrations from $migrationsPath"
$migrationFiles = Get-ChildItem -LiteralPath $migrationsPath -Filter "*.sql" | Sort-Object Name
foreach ($file in $migrationFiles) {
    Run-SqlFile -FilePath $file.FullName -DbUrl $DatabaseUrl
}

Run-SqlFile -FilePath (Join-Path $sqlPath "seed_crm_erp_test_scenarios.sql") -DbUrl $DatabaseUrl
Run-SqlFile -FilePath (Join-Path $sqlPath "smoke_check_crm_erp_post_migration.sql") -DbUrl $DatabaseUrl

if ($IncludeUat) {
    Run-SqlFile -FilePath (Join-Path $sqlPath "uat_crm_erp_business_flows.sql") -DbUrl $DatabaseUrl
}

Write-Host "CRM/ERP DB checks completed successfully."
