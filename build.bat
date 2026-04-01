@echo off
echo [DnD-Clock] Building Main Application...
pyinstaller --noconfirm DnD-Clock.spec

echo [DnD-Clock] Building Tunnel Downloader...
pyinstaller --noconfirm --onefile --console --name "start-tunnel" start-tunnel.py

echo.
echo [OK] Build complete! 
echo [!] Remember to copy your "sounds" and "images" folders into the "dist" folder if you haven't already.
echo [!] Both executables are now in the "dist" folder.
pause
