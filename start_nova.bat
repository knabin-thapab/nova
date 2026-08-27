@echo off
title NOVA Real AI Video Restoration
echo ===================================================
echo   Starting NOVA AI Video Restoration Platform
echo ===================================================
echo.

echo [1/2] Launching Python AI Engine (FastAPI on port 8000)...
start "NOVA Backend Engine" cmd /k "cd /d "%~dp0backend" && py -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching React Workstation (Vite on port 5173)...
start "NOVA Frontend UI" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul
echo.
echo Opening NOVA in browser: http://localhost:5173 ...
start http://localhost:5173

echo.
echo NOVA is now running! Keep the backend and frontend terminal windows open.
pause
