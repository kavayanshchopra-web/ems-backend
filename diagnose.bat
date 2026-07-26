@echo off
echo ========================================== > diagnose.log
echo   OMNIFLOW DEPLOYMENT DIAGNOSTICS
echo ========================================== >> diagnose.log
echo Date/Time: %date% %time% >> diagnose.log
echo Directory: %cd% >> diagnose.log
echo. >> diagnose.log

echo [1] Checking Node.js version... >> diagnose.log
call node -v >> diagnose.log 2>&1
echo. >> diagnose.log

echo [2] Checking NPM version... >> diagnose.log
call npm -v >> diagnose.log 2>&1
echo. >> diagnose.log

echo [3] Checking Git version... >> diagnose.log
call git --version >> diagnose.log 2>&1
echo. >> diagnose.log

echo [4] Checking Git Status... >> diagnose.log
call git status >> diagnose.log 2>&1
echo. >> diagnose.log

echo [5] Checking recent commits... >> diagnose.log
call git log -n 3 --oneline >> diagnose.log 2>&1
echo. >> diagnose.log

echo ========================================== >> diagnose.log
echo DIAGNOSTICS COMPLETE! >> diagnose.log
echo ========================================== >> diagnose.log
echo Diagnostics finished. Please send a screenshot or let the agent read diagnose.log!
pause
