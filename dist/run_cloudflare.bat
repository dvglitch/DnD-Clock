@echo off
echo Starting Cloudflare Tunnel...
cloudflared-windows-amd64.exe tunnel --url http://localhost:5000
pause
