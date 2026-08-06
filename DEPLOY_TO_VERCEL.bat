@echo off
title OmniFlow EMS - Vercel Live Deployment
color 0A
echo ========================================================
echo OMNIFLOW EMS - LIVE VERCEL DEPLOYMENT TOOL
echo ========================================================
echo.

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
