@echo off
title Fix All Icon Crashes and Deploy to Vercel
color 0A
cd /d "D:\AG Projects\whatsapp-crm"

echo ============================================================
echo 1. Git Commit & Push Fixes
echo ============================================================
git add frontend/src/App.jsx
git commit -m "FIX: Remove all unimported lucide icon references in telecalling tab to prevent runtime crash"
git push origin main --force

echo.
echo ============================================================
echo 2. Building frontend locally...
echo ============================================================
cd /d "D:\AG Projects\whatsapp-crm\frontend"
call npm run build
if %errorlevel% neq 0 (
  echo BUILD FAILED! Check errors above.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo 3. Deploying Production Build directly to Vercel...
echo ============================================================
npx vercel deploy --prod --yes

echo.
echo ============================================================
echo SUCCESS! 
echo Open: https://ems-crm-sandy.vercel.app
echo Press Ctrl+Shift+R to hard refresh your browser!
echo ============================================================
pause
