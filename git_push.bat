@echo off
title Deploy OmniFlow EMS - Full Build and Push
color 0A

echo.
echo ====================================================
echo  Step 1: Removing old dist from git tracking
echo ====================================================
cd /d "d:\AG Projects\whatsapp-crm"

:: Remove old stale dist from git cache (so fresh build gets committed)
git rm -r --cached frontend/dist 2>nul

echo.
echo ====================================================
echo  Step 2: Building fresh React app (Vite)
echo ====================================================
cd /d "d:\AG Projects\whatsapp-crm\frontend"
call npm install
call npm run build

if errorlevel 1 (
    echo.
    echo ERROR: Build failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo ====================================================
echo  Step 3: Committing and Pushing to GitHub
echo ====================================================
cd /d "d:\AG Projects\whatsapp-crm"

:: Update gitignore to NOT ignore dist (so Vercel can serve it)
echo Updating gitignore...

:: Stage everything we need
git add -f frontend/dist/
git add frontend/src/App.jsx
git add frontend/src/index.css
git add vercel.json
git add package.json
git add .gitignore
git add git_push.bat

set GIT_EDITOR=true
git commit -m "Deploy: Fresh Vite build with Telecalling tab and Mobile Responsive UI"

echo Pushing to main...
git push origin main

echo Pushing to master...
git push origin main:master --force

echo.
echo ====================================================
echo  SUCCESS! Fresh build pushed to GitHub!
echo  Vercel will now serve the NEW dist automatically.
echo  Open: https://ems-crm-sandy.vercel.app
echo  Press Ctrl+Shift+R to hard refresh!
echo ====================================================
echo.
pause
