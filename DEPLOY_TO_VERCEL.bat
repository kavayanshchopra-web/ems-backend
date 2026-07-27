@echo off
title OmniFlow EMS - Vercel Live Deployment
color 0A
echo ========================================================
echo OMNIFLOW EMS - LIVE VERCEL DEPLOYMENT TOOL
echo ========================================================
echo.

cd /d "d:\AG Projects\whatsapp-crm"

echo [1/2] Pushing latest updates to Git repository...
git add .
git commit -m "Deploy Mobile View Simulator & Responsive Layouts"
git push

echo.
echo [2/2] Deploying frontend directly to Vercel Live...
cd /d "d:\AG Projects\whatsapp-crm\frontend"
call npx vercel --prod --yes

echo.
echo ========================================================
echo 🎉 SUCCESS! Latest mobile updates deployed to Vercel!
echo Check live site: https://ems-crm-sandy.vercel.app
echo ========================================================
pause
