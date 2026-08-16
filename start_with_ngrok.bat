@echo off
echo ============================================
echo   Clinics Pro - Starting with Public URL
echo ============================================
echo.

REM Set PostgreSQL path
set PATH=%PATH%;C:\Program Files\PostgreSQL\17\bin

REM Start Backend
echo [1/4] Starting Backend Server...
start "Clinics Pro - Backend" cmd /k "cd /d %~dp0 && npm start"
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [2/4] Starting Frontend Dashboard...
start "Clinics Pro - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 8 /nobreak >nul

REM Start Ngrok for Frontend
echo [3/4] Creating Public URL (Ngrok)...
start "Clinics Pro - Ngrok" cmd /k "ngrok http 5173"
timeout /t 3 /nobreak >nul

REM Open browser
echo [4/4] Opening Dashboard...
start "" "http://localhost:5173"

echo.
echo ============================================
echo   System Started Successfully!
echo.
echo   Local:  http://localhost:5173
echo   Public: Check Ngrok window for URL
echo            (will be like: https://xxxx.ngrok.io)
echo ============================================
echo.
echo IMPORTANT: Share the Ngrok URL with the doctor
echo.
echo Press any key to exit...
pause >nul
