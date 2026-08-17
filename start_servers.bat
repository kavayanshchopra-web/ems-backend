@echo off
title OmniFlow - Full Stack Server Launcher
color 0A

echo.
echo  ====================================================
echo   OMNIFLOW CRM - Starting All Servers
echo  ====================================================
echo.

:: Kill any existing node processes on these ports
echo Clearing old server instances...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 >nul

echo Starting Backend (Port 5000)...
start "OmniFlow Backend :5000" cmd /k "cd /d d:\AG Projects\whatsapp-crm\backend && node server.js"

timeout /t 3 >nul

echo Starting Frontend (Port 5173)...
start "OmniFlow Frontend :5173" cmd /k "cd /d d:\AG Projects\whatsapp-crm\frontend && npm run dev -- --host 0.0.0.0"

timeout /t 4 >nul

echo.
echo  ====================================================
echo   SERVERS RUNNING!
echo.
echo   Desktop:  http://localhost:5173
echo   Mobile:   http://192.168.29.95:5173
echo   API:      http://192.168.29.95:5000
echo.
echo   Make sure phone is on SAME Wi-Fi network!
echo  ====================================================
echo.
pause
