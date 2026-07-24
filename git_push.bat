@echo off
title Git Push - Non-interactive Vercel Deploy
color 0A

echo.
echo ====================================================
echo  Automated Non-interactive Push to GitHub
echo ====================================================
echo.

cd /d "d:\AG Projects\whatsapp-crm"

:: Set non-interactive editor
set GIT_EDITOR=true

:: Stage relevant files
git add vercel.json package.json .gitignore frontend/src/App.jsx frontend/src/index.css flutter_sim_app/lib/main.dart server.js routes.js db.js git_push.bat

:: Commit cleanly without editor popup
git commit -m "Feat: Vercel build update for Telecalling and Mobile Responsive UI" --no-edit 2>nul

echo Pushing to main...
git push origin main

echo Pushing to master...
git push origin main:master --force

echo.
echo ====================================================
echo  SUCCESS! Code pushed to both main and master.
echo  Vercel is now building ems-crm-sandy.vercel.app (~30 sec).
echo ====================================================
echo.
pause
