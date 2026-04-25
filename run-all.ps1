$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendScript = Join-Path $root "run-backend.ps1"
$frontendScript = Join-Path $root "run-frontend.ps1"

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $backendScript -WorkingDirectory $root
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $frontendScript -WorkingDirectory $root

Write-Host "Started backend and frontend in separate PowerShell windows." -ForegroundColor Green
Write-Host "Backend:  http://127.0.0.1:8000/health"
Write-Host "Frontend: http://127.0.0.1:3000/login"

