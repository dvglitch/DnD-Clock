@echo off
echo Building DnD-Clock executable...
pyinstaller --noconfirm --onefile --console ^
  --name "DnD-Clock" ^
  --add-data "templates;templates" ^
  --add-data "static;static" ^
  --hidden-import "engineio.async_drivers.threading" ^
  app.py
echo Build complete. The executable is in the "dist" folder.
pause
