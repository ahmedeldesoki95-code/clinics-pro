@echo off
echo ============================================
echo      Clinics Pro - Starting System
echo ============================================
echo.

REM Set PostgreSQL path
set PATH=%PATH%;C:\Program Files\PostgreSQL\17\bin

REM Start Backend
echo [1/3] Starting Backend Server...
start "Clinics Pro - Backend" cmd /k "cd /d %~dp0 && npm start"
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [2/3] Starting Frontend Dashboard...
start "Clinics Pro - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 8 /nobreak >nul

REM Open browser
echo [3/3] Opening Dashboard...
start "" "http://localhost:5173"

echo.
echo ============================================
echo   System Started Successfully!
echo   Dashboard: http://localhost:5173
echo ============================================
echo.
echo Press any key to exit...
pause >nul
