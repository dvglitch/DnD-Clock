@echo off
echo Building DnD-Clock executable...
pyinstaller --noconfirm DnD-Clock.spec
echo Build complete. The executable is in the "dist" folder.
pause
