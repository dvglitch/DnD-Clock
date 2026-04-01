@echo off
set BINARY=cloudflared-windows-amd64.exe
set URL=https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe

echo ==========================================
echo    DnD-Clock: Cloudflare Tunnel System
echo ==========================================

REM Check if the binary exists
if not exist "%BINARY%" (
    echo [!] Cloudflare binary not found.
    echo [*] Downloading latestversion from GitHub (approx. 65MB)...
    echo [*] This only needs to happen once.
    
    REM Try curl first (standard on Win 10/11)
    curl -L -o "%BINARY%" "%URL%"
    
    if errorlevel 1 (
        echo [!] curl failed, falling back to PowerShell...
        powershell -Command "Invoke-WebRequest -Uri '%URL%' -OutFile '%BINARY%'"
    )
)

REM Verify we have the binary now
if exist "%BINARY%" (
    echo [OK] Binary ready.
    echo [*] Starting the tunnel to your local DnD-Clock server...
    echo [*] (Make sure your app.py is already running in another window!)
    echo.
    "%BINARY%" tunnel --url http://localhost:5000
) else (
    echo [ERROR] Could not download the Cloudflare binary.
    echo [ERROR] Please check your internet connection or download it manually from:
    echo %URL%
    pause
)
