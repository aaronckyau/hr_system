$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Missing backend virtual environment: $venvPython" -ForegroundColor Red
    Write-Host "Run these first:" -ForegroundColor Yellow
    Write-Host "  cd backend"
    Write-Host "  python -m venv .venv"
    Write-Host "  .\.venv\Scripts\activate"
    Write-Host "  pip install -r requirements.txt"
    exit 1
}

try {
    $listener = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($listener) {
        Write-Host "Port 8000 is already in use by PID $($listener.OwningProcess)." -ForegroundColor Yellow
        Write-Host "Backend may already be running."
        exit 0
    }
} catch {
}

Set-Location $backendDir
& $venvPython -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

