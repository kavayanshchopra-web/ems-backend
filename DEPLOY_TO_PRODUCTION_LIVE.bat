@echo off
title OmniFlow EMS - Official Production Live Deployment
color 0A
echo ========================================================
echo OMNIFLOW EMS - OFFICIAL PRODUCTION LIVE DEPLOYMENT TOOL
echo (Target: app.employeemanagementsystems.com)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Building frontend for Production Live...
cd /d "%~dp0frontend"
if exist "dist" rmdir /s /q "dist"
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"

call npm install
call npm run build
if %errorlevel% neq 0 (
  color 0C
  echo.
  echo ❌ LOCAL BUILD FAILED! Live deployment aborted.
  pause
  exit /b %errorlevel%
)

echo [2/3] Staging and pushing frontend & backend updates to Git...
cd /d "%~dp0"
git add -f frontend/dist/
git add frontend/
git add routes.js
git add services/
git add db.js
git add server.js
git add vercel.json
git add package.json
git add .gitignore
git add DEPLOY_TO_PRODUCTION_LIVE.bat
set GIT_EDITOR=true
git commit -m "Production Deploy: Dynamic Dashboard Engine, Multi-Tenant GHL Isolation, Currency and RBAC fixes"
git push origin main

echo.
echo [3/3] Promoting build to Official Live Production Domain...
cd /d "%~dp0frontend"
call npx vercel --prod --yes --force
if %errorlevel% neq 0 (
  color 0C
  echo ❌ VERCEL PRODUCTION DEPLOYMENT FAILED!
  pause
  exit /b %errorlevel%
)

echo.
echo ========================================================
color 0A
echo 🎉 SUCCESS! Promoted to Official Live Domain!
echo Open Live Site: https://app.employeemanagementsystems.com
echo Press Ctrl+Shift+R to hard refresh!
echo ========================================================
pause
