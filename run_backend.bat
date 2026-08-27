@echo off
title NOVA AI Backend Server
echo ===================================================
echo     NOVA AI Video & Photo Restoration Backend
echo ===================================================
cd /d "%~dp0\backend"
echo Starting FastAPI Python server on http://127.0.0.1:8000 ...
py -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
if %errorlevel% neq 0 (
    echo.
    echo Trying python launcher...
    python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
)
pause
