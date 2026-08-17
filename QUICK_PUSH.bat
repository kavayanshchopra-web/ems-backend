@echo off
title PUSH - Clean Telecalling Nav
color 0A
cd /d "D:\AG Projects\whatsapp-crm"

echo ============================================================
echo   STAGING & COMMITTING APP.JSX
echo ============================================================
git add frontend/src/App.jsx
set current_time=%time%
git commit -m "QUICK PUSH - %date% %current_time%" --allow-empty

echo.
echo ============================================================
echo   PUSHING TO GITHUB (MAIN BRANCH)...
echo ============================================================
git push origin main --force

if %ERRORLEVEL% NEQ 0 (
  color 4F
  echo.
  echo [ERROR] GIT PUSH FAILED!
  echo GitHub reject kiya ya login failure hua. Screen ka text dekhein!
  echo ============================================================
  pause
  exit /b %ERRORLEVEL%
)

color 0A
echo.
echo ============================================================
echo   [SUCCESS] GIT PUSH COMPLETE!
echo   Now open vercel.com -> ems-crm -> Deployments
echo   Check if a NEW deployment is Building...
echo ============================================================
pause
