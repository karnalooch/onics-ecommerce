$ErrorActionPreference = "Stop"

$Url = "http://localhost:3100"
$Service = "celtronics"
$MaxAttempts = 60
$DelaySeconds = 2

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "        ONICS / CELTRONICS START" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker CLI is not available in PATH." -ForegroundColor Red
    exit 1
}

docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker Compose is not available." -ForegroundColor Red
    exit 1
}

Write-Host "[1/4] Starting Docker Compose stack..." -ForegroundColor Yellow
docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] docker compose up failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[2/4] Waiting for $Service to become healthy..." -ForegroundColor Yellow

$Healthy = $false

for ($i = 1; $i -le $MaxAttempts; $i++) {
    $ContainerId = docker compose ps -q $Service 2>$null | Select-Object -First 1

    if ($ContainerId) {
        $Health = docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $ContainerId 2>$null
        $Health = "$Health".Trim()
        Write-Host "  [$i/$MaxAttempts] $Service`: $Health"

        if ($Health -eq "healthy") {
            $Healthy = $true
            break
        }

        if ($Health -in @("unhealthy", "exited", "dead")) {
            break
        }
    }
    else {
        Write-Host "  [$i/$MaxAttempts] $Service`: container not available yet"
    }

    Start-Sleep -Seconds $DelaySeconds
}

Write-Host ""
Write-Host "[3/4] Container status:" -ForegroundColor Yellow
docker compose ps

if (-not $Healthy) {
    Write-Host ""
    Write-Host "[ERROR] ONICS did not reach healthy state." -ForegroundColor Red
    Write-Host "Last 120 service log lines:" -ForegroundColor Red
    Write-Host ""

    docker compose logs $Service --tail 120
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "           ONICS IS HEALTHY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host ""
Write-Host "URL:" -ForegroundColor Cyan
Write-Host "  $Url"

Write-Host ""
Write-Host "LOGIN:" -ForegroundColor Cyan
Write-Host "  admin@celtronics.pl"

Write-Host ""
Write-Host "LOCAL BOOTSTRAP PASSWORD:" -ForegroundColor Cyan

$PasswordLog = docker compose logs $Service 2>&1 |
    Select-String "local bootstrap password"

if ($PasswordLog) {
    $PasswordLog | ForEach-Object {
        Write-Host "  $($_.Line)" -ForegroundColor Green
    }
}
else {
    Write-Host "  Bootstrap password not found in current logs." -ForegroundColor DarkGray
    Write-Host "  The local admin may already have been initialized." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "[4/4] Opening $Url" -ForegroundColor Yellow
Start-Process $Url

Write-Host ""
Write-Host "Done." -ForegroundColor Green
