@echo off
title Fix All Build Errors and Deploy to Vercel
color 0A
cd /d "%~dp0"

echo ============================================================
echo 1. Building frontend locally...
echo ============================================================
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
  color 0C
  echo.
  echo ❌ BUILD FAILED! Check errors above.
  pause
  exit /b %errorlevel%
)

echo.
echo ============================================================
echo 2. Git Commit & Push Fixes
echo ============================================================
cd /d "%~dp0"
git add .
git commit -m "FIX: Resolve build syntax error and verify production bundle"
git push origin main
if %errorlevel% neq 0 (
  color 0C
  echo.
  echo ❌ GIT PUSH FAILED!
  pause
  exit /b %errorlevel%
)

echo.
echo ============================================================
echo 3. Deploying Production Build directly to Vercel...
echo ============================================================
cd /d "%~dp0frontend"
call npx vercel deploy --prod --yes
if %errorlevel% neq 0 (
  color 0C
  echo.
  echo ❌ VERCEL DEPLOYMENT FAILED! Check Vercel build log above.
  pause
  exit /b %errorlevel%
)

echo.
echo ============================================================
color 0A
echo 🎉 SUCCESS! Deployment to Vercel complete!
echo Open: https://ems-crm-sandy.vercel.app
echo Press Ctrl+Shift+R to hard refresh your browser!
echo ============================================================
pause
