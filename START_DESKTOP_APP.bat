@echo off
cd /d "%~dp0"
title OmniFlow Desktop App — Staff WhatsApp Monitor & CRM
color 0B

echo.
echo  ================================================================
echo   OMNIFLOW CRM - Desktop Suite (StaffPeek Style Multi-Staff Hub)
echo  ================================================================
echo.

echo  [1/3] Ensuring backend and frontend servers are running...
call "%~dp0start_servers.bat"

echo.
echo  [2/3] Waiting 4 seconds for frontend to initialize on :5173...
timeout /t 4 >nul

echo.
echo  [3/3] Launching OmniFlow Native Desktop App (Zero-Iframe Restrictions)...
call npx -y electron "%~dp0electron\main.cjs"

pause
