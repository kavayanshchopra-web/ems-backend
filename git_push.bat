@echo off
title Git Push - Dual Push to Main and Master for Vercel Production
color 0A

echo.
echo ====================================================
echo  Pushing to BOTH 'main' and 'master' Branches on GitHub
echo ====================================================
echo.

cd /d "d:\AG Projects\whatsapp-crm"

git add .gitignore frontend/src/App.jsx frontend/src/index.css flutter_sim_app/lib/main.dart server.js routes.js db.js git_push.bat
git commit -m "Feat: Complete Mobile Responsive UI with Hamburger Drawer and Expanded CRM Telecalling Tab"

echo Pushing to origin main...
git push origin main

echo Pushing to origin master...
git push origin main:master --force

echo.
echo ====================================================
echo  SUCCESS! Pushed to BOTH main and master branches!
echo  Vercel production (ems-crm-sandy.vercel.app) is building (~30 sec).
echo ====================================================
echo.
pause
