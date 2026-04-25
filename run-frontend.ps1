$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $root "frontend"

try {
    $listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($listener) {
        Write-Host "Port 3000 is already in use by PID $($listener.OwningProcess)." -ForegroundColor Yellow
        Write-Host "Frontend may already be running."
        exit 0
    }
} catch {
}

Set-Location $frontendDir

if (-not (Test-Path ".env.local")) {
    if (Test-Path ".env.local.example") {
        Copy-Item ".env.local.example" ".env.local"
    } else {
        Write-Host "Missing .env.local and .env.local.example" -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path "node_modules")) {
    & "C:\Program Files\nodejs\npm.cmd" install
}

& "C:\Program Files\nodejs\npm.cmd" run build
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& "C:\Program Files\nodejs\npm.cmd" run start

