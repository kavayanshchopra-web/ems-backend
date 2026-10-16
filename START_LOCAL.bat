@echo off
title Local Dev Server - OmniFlow EMS
color 0A
echo.
echo Starting local frontend dev server...
echo Open: http://localhost:5173
echo.
cd /d "%~dp0frontend"
call npm run dev
