@echo off
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;C:\Users\Lenovo\AppData\Roaming\npm;%LOCALAPPDATA%\Programs\node;%APPDATA%\npm"
cd /d "%~dp0"
title OmniFlow Backend :5000
color 0A
echo ====================================================
echo   Starting OmniFlow Backend Server on Port 5000
echo ====================================================
echo.
node server.js
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] Backend exited with error code %ERRORLEVEL%
)
pause
