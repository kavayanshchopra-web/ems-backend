@echo off
title FINAL DEPLOY - OmniFlow EMS
color 0A

echo.
echo ============================================================
echo   FINAL DEPLOY - Pushing ALL source + vercel.json
echo ============================================================
cd /d "D:\AG Projects\whatsapp-crm"

:: Remove old committed dist from git (clean slate)
git rm -r --cached frontend/dist 2>nul

:: Stage ALL important files
git add vercel.json
git add frontend/src/App.jsx
git add frontend/src/index.css
git add frontend/src/main.jsx
git add frontend/index.html
git add frontend/vite.config.js
git add frontend/package.json
git add frontend/.gitignore
git add .gitignore

git commit -m "FINAL: Vercel build from source - Telecalling + Mobile UI"

echo Pushing to main...
git push origin main --force

echo Pushing to master...
git push origin main:master --force

echo.
echo ============================================================
echo   DONE! Now go to Vercel Dashboard:
echo   vercel.com - ems-crm - Deployments
echo   Click the latest deployment and wait for Build to complete!
echo ============================================================
pause
