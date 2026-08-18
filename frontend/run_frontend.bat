@echo off
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;C:\Users\Lenovo\AppData\Roaming\npm;%LOCALAPPDATA%\Programs\node;%APPDATA%\npm"
cd /d "%~dp0"
title OmniFlow Frontend :5173
color 0B
echo ====================================================
echo   Starting OmniFlow Frontend Dev Server on Port 5173
echo ====================================================
echo.
call npm run dev -- --host 0.0.0.0
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] Frontend exited with error code %ERRORLEVEL%
)
pause
