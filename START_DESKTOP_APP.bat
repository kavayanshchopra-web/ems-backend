@echo off
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;C:\Users\Lenovo\AppData\Roaming\npm;%LOCALAPPDATA%\Programs\node;%APPDATA%\npm"
cd /d "%~dp0"
title OmniFlow Desktop App — Staff WhatsApp Monitor & CRM
color 0B

echo.
echo  ================================================================
echo   OMNIFLOW CRM - Desktop Suite (Native WhatsApp Web & Live Hub)
echo  ================================================================
echo.

echo  [1/3] Ensuring backend and frontend servers are running...
call "%~dp0start_servers.bat"

echo.
echo  [2/3] Waiting 4 seconds for servers to initialize...
timeout /t 4 >nul

echo.
echo  [3/3] Launching OmniFlow Native Desktop App...
call npx -y electron "%~dp0electron\main.cjs"

pause
