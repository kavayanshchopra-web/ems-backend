@echo off
title OmniFlow EMS - Vercel Sandbox (Staging) Deployment
color 0B
echo ========================================================
echo   OMNIFLOW EMS - SANDBOX STAGING DEPLOYMENT TOOL
echo   Target: https://sandbox.employeemanagementsystems.com
echo   Branch: staging (SAFE - LIVE PRODUCTION IS UNTOUCHED)
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
echo [2/3] Staging and pushing frontend updates to Git branch staging...
cd /d "%~dp0"
git checkout staging
git add frontend/
git add DEPLOY_TO_SANDBOX.bat
git commit -m "Deploy latest build to sandbox staging environment"
git push origin staging
echo Git staging sync complete.

echo.
echo [3/3] Deploying frontend directly to Vercel Sandbox (Permanent Domain)...
cd /d "%~dp0"
call node deploy_sandbox_step.mjs
if %errorlevel% neq 0 (
  color 0C
  echo.
  echo ========================================================
  echo ❌ VERCEL SANDBOX DEPLOYMENT FAILED!
  echo Check Vercel build logs above.
  echo ========================================================
  pause
  exit /b %errorlevel%
)

echo.
echo ========================================================
color 0A
echo 🎉 SUCCESS! Latest updates deployed to Sandbox!
echo Check sandbox site: https://sandbox.employeemanagementsystems.com
echo Note: Production (https://app.employeemanagementsystems.com) is 100% UNTOUCHED!
echo ========================================================
pause
