@echo off
title Git Push - Purge Heavy Commits and Push Source Code
color 0A

echo.
echo ====================================================
echo  Resetting Bad Local Commits and Pushing Pure Source Code
echo ====================================================
echo.

cd /d "d:\AG Projects\whatsapp-crm"

:: Fetch latest remote state
git fetch origin

:: Reset local branch to origin/main (erases 1.2GB zip commit history locally)
git reset --mixed origin/main

:: Remove any untracked zip files from git index
git rm --cached -r -f flutter_sim_app/build 2>nul
git rm --cached -f flutter_sim_app/flutter.zip 2>nul
git rm --cached -f flutter_sim_app/jdk17.zip 2>nul

:: Stage ONLY light source files
git add .gitignore frontend/src/App.jsx frontend/src/index.css flutter_sim_app/lib/main.dart server.js routes.js db.js git_push.bat

git commit -m "Feat: Complete Mobile Responsive UI with Hamburger Drawer and Expanded CRM Telecalling Tab"
git push origin main

echo.
echo ====================================================
echo  SUCCESS! Pure source code pushed to GitHub!
echo  Vercel is now building the update (~60 sec).
echo ====================================================
echo.
pause
