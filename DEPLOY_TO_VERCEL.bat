@echo off
title OmniFlow EMS - Vercel Live Deployment
color 0A
echo ========================================================
echo OMNIFLOW EMS - LIVE VERCEL DEPLOYMENT TOOL
echo ========================================================
echo.

cd /d "d:\AG Projects\whatsapp-crm"

echo [1/2] Pushing latest mobile optimization updates to Git...
git add .
git commit -m "Update Mobile App View Simulator & Page Responsiveness"
git push

echo.
echo ========================================================
echo 🎉 SUCCESS! Latest mobile updates pushed to Live Vercel!
echo Check live site: https://ems-crm-sandy.vercel.app
echo ========================================================
pause
