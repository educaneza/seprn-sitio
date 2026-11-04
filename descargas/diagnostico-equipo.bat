@echo off
rem Diagnostico de equipo - OTDE SEPRN. Solo lee informacion del equipo.
rem Debe estar en la misma carpeta que diagnostico-equipo.ps1
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnostico-equipo.ps1"
echo.
pause
