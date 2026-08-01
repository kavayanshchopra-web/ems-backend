@echo off
title OmniFlow EMS - Vercel Live Deployment
color 0A
echo ========================================================
echo OMNIFLOW EMS - LIVE VERCEL DEPLOYMENT TOOL
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Building frontend locally to ensure 0 build errors...
cd /d "%~dp0frontend"
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
echo [2/3] Pushing latest updates to Git repository...
cd /d "%~dp0"
git add -A
git commit -m "UI UX fixes and vertical scrollbar update"
git push
if %errorlevel% neq 0 (
  color 0C
  echo.
  echo ========================================================
  echo ⚠️ Git push notice (deployment will continue directly to Vercel)...
  echo ========================================================
)

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
