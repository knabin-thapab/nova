@echo off
title NOVA AI Launcher
echo ===================================================
echo     Starting NOVA AI Full-Stack Workstation
echo ===================================================
start "NOVA Backend (FastAPI)" cmd /c "%~dp0run_backend.bat"
start "NOVA Frontend (Vite)" cmd /c "%~dp0run_frontend.bat"
echo.
echo Both servers are starting up!
echo Frontend: http://localhost:5173
echo Backend:  http://127.0.0.1:8000
echo.
pause
