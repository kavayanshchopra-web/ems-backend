@echo off
title DEPLOY LOCAL BUILD TO VERCEL
color 0B
echo.
echo ============================================================
echo  STEP 1: Installing dependencies & Building frontend locally...
echo ============================================================
cd /d "D:\AG Projects\whatsapp-crm\frontend"
call npm install --legacy-peer-deps --no-audit
call npm run build
if %errorlevel% neq 0 (
  echo BUILD FAILED! Check errors above.
  pause
  exit /b 1
)
echo.
echo ============================================================
echo  STEP 2: Deploying to Vercel Production...
echo ============================================================
npx vercel deploy --prod --yes
echo.
echo ============================================================
echo  DONE! Check: https://ems-crm-sandy.vercel.app
echo  Ctrl+Shift+R to hard refresh browser!
echo ============================================================
pause
