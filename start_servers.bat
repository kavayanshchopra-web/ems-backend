@echo off
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;C:\Users\Lenovo\AppData\Roaming\npm;%LOCALAPPDATA%\Programs\node;%APPDATA%\npm"
cd /d "%~dp0"
title OmniFlow - Full Stack Server Launcher
color 0A

echo.
echo  ====================================================
echo   OMNIFLOW CRM - Starting All Servers
echo  ====================================================
echo.

:: Kill any existing node processes on ports 5000 and 5173
echo [1/3] Clearing old server instances...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 >nul

echo [2/3] Starting Backend (Port 5000)...
start "OmniFlow Backend" cmd /k "cd /d ""%~dp0backend"" && call run_backend.bat"

timeout /t 2 >nul

echo [3/3] Starting Frontend (Port 5173)...
start "OmniFlow Frontend" cmd /k "cd /d ""%~dp0frontend"" && call run_frontend.bat"

timeout /t 2 >nul

echo.
echo  ====================================================
echo   SERVERS LAUNCHED!
echo.
echo   Desktop CRM:  http://localhost:5173
echo   API Server:   http://localhost:5000
echo  ====================================================
echo.
pause
