@echo off
title OmniFlow EMS — Push Source to GitHub (Vercel Builds Automatically)
color 0A

echo.
echo ============================================================
echo   Pushing Source Code to GitHub
echo   Vercel will auto-build and deploy from source!
echo ============================================================
cd /d "D:\AG Projects\whatsapp-crm"

:: Remove old dist from git tracking if it was ever committed
git rm -r --cached frontend/dist 2>nul

:: Stage source code only (Vercel builds dist itself)
git add frontend/src/
git add frontend/index.html
git add frontend/vite.config.js
git add frontend/package.json
git add frontend/.gitignore
git add vercel.json
git add .gitignore
git add BUILD_AND_DEPLOY.bat

git commit -m "Deploy: OmniFlow EMS - Telecalling + Mobile Responsive UI [Vercel auto-build]"

echo.
echo Pushing to GitHub...
git push origin main
git push origin main:master --force

echo.
echo ============================================================
color 0A
echo   SUCCESS! Source code pushed to GitHub!
echo.
echo   Vercel is now building your app automatically...
echo   Check build progress at: https://vercel.com/dashboard
echo.
echo   After build completes (1-2 min), open:
echo   https://ems-crm-sandy.vercel.app
echo.
echo   Press Ctrl+Shift+R for hard refresh!
echo ============================================================
echo.
pause
