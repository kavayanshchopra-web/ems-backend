@echo off
title FORCE PUSH App.jsx to GitHub
color 0A

echo.
echo ============================================================
echo   FORCING App.jsx commit to GitHub
echo   (Version marker added to force git detection)
echo ============================================================
cd /d "D:\AG Projects\whatsapp-crm"

:: Check git status for App.jsx
echo Git status of App.jsx:
git status frontend/src/App.jsx

echo.
echo Staging App.jsx (force)...
git add frontend/src/App.jsx

echo.
echo Git status after add:
git status frontend/src/App.jsx

set current_time=%time%
git commit -m "FORCE: App.jsx deep fix - %date% %current_time%" --allow-empty

echo.
echo Pushing to GitHub...
git push origin main --force

if %ERRORLEVEL% NEQ 0 (
  color 4F
  echo.
  echo [ERROR] GIT PUSH FAILED!
  echo GitHub connection or auth failed. Look at the console message above!
  echo ============================================================
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo ============================================================
color 0A
echo   DONE! App.jsx pushed to GitHub!
echo.
echo   Now go to Vercel: vercel.com - ems-crm - Deployments
echo   Click the LATEST deployment - THREE DOTS - REDEPLOY
echo   Wait 30-60 seconds for REAL build to complete!
echo ============================================================
echo.
pause
