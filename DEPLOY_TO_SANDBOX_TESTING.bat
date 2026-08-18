@echo off
title OmniFlow EMS - Sandbox Testing Deployment
color 0E
echo ========================================================
echo OMNIFLOW EMS - SANDBOX TESTING DEPLOYMENT TOOL
echo (Target: Preview / Sandbox URL - Live Domain Untouched)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Building frontend for Sandbox Testing...
cd /d "%~dp0frontend"
if exist "dist" rmdir /s /q "dist"
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"

call npm install
call npm run build
if %errorlevel% neq 0 (
  color 0C
  echo.
  echo ❌ LOCAL BUILD FAILED! Testing deployment aborted.
  pause
  exit /b %errorlevel%
)

echo.
echo [2/2] Deploying to Vercel Preview Sandbox...
cd /d "%~dp0frontend"
call npx vercel --yes --force
if %errorlevel% neq 0 (
  color 0C
  echo ❌ VERCEL SANDBOX DEPLOYMENT FAILED!
  pause
  exit /b %errorlevel%
)

echo.
echo ========================================================
color 0E
echo 🧪 SUCCESS! Deployed to Sandbox Preview URL for testing!
echo Check Sandbox URL above (e.g. ems-crm-sandy.vercel.app)
echo Main Domain (app.employeemanagementsystems.com) is UNTOUCHED.
echo ========================================================
pause
