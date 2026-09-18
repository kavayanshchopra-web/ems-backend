@echo off
echo ========================================================
echo   OmniFlow Companion -- Automated Cloud Release Pipeline
echo ========================================================
echo.
cd /d "%~dp0android_companion_app"
echo [1/3] Compiling fresh Android APK...
cmd /c "if exist build\tmp rmdir /s /q build\tmp & if exist build\intermediates\javac rmdir /s /q build\intermediates\javac & gradlew.bat --no-daemon assembleDebug"
if errorlevel 1 (
    echo [ERROR] Gradle build failed!
    exit /b %errorlevel%
)

echo [2/3] Copying APK to workspace root...
copy /y "build\outputs\apk\debug\OmniFlowSIMRecorder-debug.apk" "..\OmniFlow-Live-Companion.apk"

cd /d "%~dp0"
echo [3/3] Uploading APK and publishing version.json to Supabase CDN...
node scripts/publish-companion.mjs
echo.
echo ========================================================
echo   Release deployed successfully!
echo ========================================================
