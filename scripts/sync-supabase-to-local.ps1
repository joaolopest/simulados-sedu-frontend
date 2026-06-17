param(
  [switch]$Yes
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

function Normalize-DumpUrl {
  param([string]$Url)
  if ($Url.StartsWith("postgresql+psycopg://")) {
    return "postgresql://" + $Url.Substring("postgresql+psycopg://".Length)
  }
  if ($Url.StartsWith("postgres://")) {
    return "postgresql://" + $Url.Substring("postgres://".Length)
  }
  return $Url
}

$rootEnv = Join-Path $Root ".env"
$backendEnv = Join-Path $Root "backend\.env"
$sourceUrl = $env:DATABASE_URL
if (-not $sourceUrl) { $sourceUrl = Read-DotEnvValue $rootEnv "DATABASE_URL" }
if (-not $sourceUrl) { $sourceUrl = Read-DotEnvValue $backendEnv "DATABASE_URL" }
if (-not $sourceUrl) {
  throw "DATABASE_URL do Supabase nao encontrada em env, .env ou backend/.env."
}

$sourceUrl = Normalize-DumpUrl $sourceUrl
if (-not $Yes) {
  $resp = Read-Host "Isto vai substituir o banco local Docker 'seduc' pelo dump do Supabase. Continuar? (digite SIM)"
  if ($resp -ne "SIM") {
    Write-Host "Cancelado."
    exit 0
  }
}

$backupDir = Join-Path $Root "backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpName = "supabase-$stamp.dump"
$dumpPath = Join-Path $backupDir $dumpName

Write-Host "Subindo Postgres local..."
docker compose --profile local-db up -d db

Write-Host "Gerando dump do Supabase..."
docker run --rm -v "${backupDir}:/backup" postgres:16 `
  pg_dump $sourceUrl --format=custom --no-owner --no-privileges --file="/backup/$dumpName"

Write-Host "Restaurando dump no banco local Docker..."
docker cp $dumpPath "sedu-db:/tmp/$dumpName"
docker compose --profile local-db exec -T db psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS seduc WITH (FORCE);"
docker compose --profile local-db exec -T db psql -U postgres -d postgres -c "CREATE DATABASE seduc;"
docker compose --profile local-db exec -T db pg_restore -U postgres -d seduc --no-owner --no-privileges "/tmp/$dumpName"

Write-Host "Backup local atualizado: $dumpPath"
