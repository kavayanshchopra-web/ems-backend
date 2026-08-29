@echo off
title Voxbay Local Desktop Telephony Bridge
color 0A
echo ========================================================
echo  VOXBAY LOCAL DESKTOP TELEPHONY BRIDGE
echo  Relaying Calls from GoHighLevel and Web to Softphone
echo ========================================================
echo.

cd /d "%~dp0"
node local_voxbay_bridge.mjs
pause
