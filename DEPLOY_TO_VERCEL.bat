@echo off
title OmniFlow EMS - LIVE PRODUCTION DEPLOYMENT LOCKED
color 0C
echo ========================================================
echo  [CRITICAL SAFETY LOCK] LIVE PRODUCTION DEPLOYMENT
echo  Target: https://app.employeemanagementsystems.com
echo ========================================================
echo.
echo  WARNING: This tool deploys directly to LIVE CLIENTS!
echo  All new developments and tests MUST be tested on:
echo  https://sandbox.employeemanagementsystems.com
echo.
echo  To deploy to SANDBOX safely, close this window and run:
echo  DEPLOY_TO_SANDBOX.bat
echo ========================================================
echo.
set /p CONFIRM="Type 'DEPLOY_LIVE_CONFIRMED' to proceed to LIVE PRODUCTION: "
if not "%CONFIRM%"=="DEPLOY_LIVE_CONFIRMED" (
  echo.
  echo [SAFETY ABORT] Deployment to Live cancelled. Production is safe.
  pause
  exit /b 1
)

color 0A
echo.
echo [CONFIRMED] Proceeding with Live Deployment...
cd /d "%~dp0"

echo [1/3] Cleaning Vite cache and building frontend locally...
cd /d "%~dp0frontend"
if exist "dist" rmdir /s /q "dist"
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"

call npm install
call npm run build
if %errorlevel% neq 0 (
  color 0C
  echo.
  echo ========================================================
  echo ❌ LOCAL BUILD FAILED! Deployment aborted.
  echo Fix the build errors shown above before deploying.
  echo ========================================================
  pause
  exit /b %errorlevel%
)

echo.
echo [2/3] Staging and pushing frontend updates to Git...
cd /d "%~dp0"
git add frontend/
git add DEPLOY_TO_VERCEL.bat
git commit -m "Update Recruitment ATS Kanban unconditional card details and clear cache"
git push origin main
echo Git sync step complete.

echo.
echo [3/3] Deploying frontend directly to Vercel Live (Forced Fresh Build)...
cd /d "%~dp0frontend"
call npx vercel --prod --yes --force
if %errorlevel% neq 0 (
  color 0C
  echo.
  echo ========================================================
  echo ❌ VERCEL DEPLOYMENT FAILED!
  echo Check Vercel build logs above.
  echo ========================================================
  pause
  exit /b %errorlevel%
)

echo.
echo ========================================================
color 0A
echo 🎉 SUCCESS! Latest updates deployed to Vercel!
echo Check live site: https://ems-crm-sandy.vercel.app
echo ========================================================
pause
