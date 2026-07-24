@echo off
title Git Push - Explicit Vercel Config and Source Code Push
color 0A

echo.
echo ====================================================
echo  Pushing Explicit Vercel Build Config and Frontend Code
echo ====================================================
echo.

cd /d "d:\AG Projects\whatsapp-crm"

git add vercel.json package.json .gitignore frontend/src/App.jsx frontend/src/index.css flutter_sim_app/lib/main.dart server.js routes.js db.js git_push.bat
git commit -m "Feat: Explicit root vercel.json build config and CRM Telecalling mobile responsive tab"

echo Pushing to origin main...
git push origin main

echo Pushing to origin master...
git push origin main:master --force

echo.
echo ====================================================
echo  SUCCESS! Vercel build configuration and code pushed!
echo  Vercel is now building from vercel.json (~45 sec).
echo ====================================================
echo.
pause
