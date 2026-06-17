param(
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Read-DotEnvValue {
  param([string]$Path, [string]$Name)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) { continue }
    $idx = $trimmed.IndexOf("=")
    if ($idx -lt 1) { continue }
    $key = $trimmed.Substring(0, $idx).Trim()
    if ($key -ne $Name) { continue }
    return $trimmed.Substring($idx + 1).Trim().Trim('"').Trim("'")
  }
  return $null
}

function Test-DatabaseUrl {
  param([string]$Url)
  if (-not $Url) { return $false }
  $python = Join-Path $Root "backend\.venv\Scripts\python.exe"
  if (-not (Test-Path -LiteralPath $python)) { $python = "python" }
  $env:SEDU_TEST_DATABASE_URL = $Url
  & $python -c "import os, sys; from sqlalchemy import create_engine, text; url=os.environ['SEDU_TEST_DATABASE_URL']; url=url.replace('postgresql://','postgresql+psycopg://',1).replace('postgres://','postgresql+psycopg://',1); e=create_engine(url, pool_pre_ping=True); c=e.connect(); c.execute(text('select 1')); c.close()" *> $null
  $ok = $LASTEXITCODE -eq 0
  Remove-Item Env:\SEDU_TEST_DATABASE_URL -ErrorAction SilentlyContinue
  return $ok
}

$rootEnv = Join-Path $Root ".env"
$backendEnv = Join-Path $Root "backend\.env"
$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl) { $databaseUrl = Read-DotEnvValue $rootEnv "DATABASE_URL" }
if (-not $databaseUrl) { $databaseUrl = Read-DotEnvValue $backendEnv "DATABASE_URL" }

$composeArgs = @("compose", "up")
if (-not $NoBuild) { $composeArgs += "--build" }

if ($databaseUrl -and (Test-DatabaseUrl $databaseUrl)) {
  Write-Host "Supabase disponivel. Usando DATABASE_URL configurado e mantendo sedu-db parado."
  $env:DATABASE_URL = $databaseUrl
  docker compose stop db 2>$null | Out-Null
  $args = $composeArgs + @("backend", "frontend")
  docker @args
  exit $LASTEXITCODE
}

Write-Host "Supabase indisponivel ou sem DATABASE_URL. Usando Postgres local via Docker."
$env:DATABASE_URL = "postgresql+psycopg://postgres:postgres@db:5432/seduc"
docker compose --profile local-db up -d db
$args = @("compose", "--profile", "local-db", "up")
if (-not $NoBuild) { $args += "--build" }
$args += @("backend", "frontend")
docker @args
exit $LASTEXITCODE
