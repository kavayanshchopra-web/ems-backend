@echo off
title OmniFlow Companion App - Gradle Builder
color 0B
echo ========================================================
echo OMNIFLOW COMPANION APP - NATIVE APK BUILDER
echo ========================================================
echo.

:: Check if local.properties exists in android_companion_app, copy if missing from flutter_sim_app
if not exist "d:\AG Projects\whatsapp-crm\android_companion_app\local.properties" (
    if exist "d:\AG Projects\whatsapp-crm\flutter_sim_app\android\local.properties" (
        echo Copying local.properties from flutter_sim_app...
        copy "d:\AG Projects\whatsapp-crm\flutter_sim_app\android\local.properties" "d:\AG Projects\whatsapp-crm\android_companion_app\" >nul
    ) else (
        echo Generating local.properties with standard SDK path...
        echo sdk.dir=C:\\Users\\Lenovo\\AppData\\Local\\Android\\Sdk > "d:\AG Projects\whatsapp-crm\android_companion_app\local.properties"
    )
)

:: Check if gradle.properties exists in android_companion_app, copy if missing from playground project
if not exist "d:\AG Projects\whatsapp-crm\android_companion_app\gradle.properties" (
    if exist "d:\AG Projects\omniflow-call-recorder\gradle.properties" (
        echo Copying gradle.properties from omniflow-call-recorder...
        copy "d:\AG Projects\omniflow-call-recorder\gradle.properties" "d:\AG Projects\whatsapp-crm\android_companion_app\" >nul
    )
)

:: Check if gradlew.bat exists in android_companion_app, copy if missing from playground project
if not exist "d:\AG Projects\whatsapp-crm\android_companion_app\gradlew.bat" (
    echo Gradle wrapper missing in android_companion_app. Copying wrapper from omniflow-call-recorder...
    xcopy "d:\AG Projects\omniflow-call-recorder\gradlew*" "d:\AG Projects\whatsapp-crm\android_companion_app\" /Y >nul
    xcopy "d:\AG Projects\omniflow-call-recorder\gradle" "d:\AG Projects\whatsapp-crm\android_companion_app\gradle" /E /I /H /Y >nul
    echo Wrapper copied successfully!
)

:: Force copy complete clean res folder from flutter_sim_app (contains launcher icons and layouts)
echo Syncing resource files and launcher icons from flutter_sim_app...
if exist "d:\AG Projects\whatsapp-crm\android_companion_app\src\main\res" (
    rmdir /S /Q "d:\AG Projects\whatsapp-crm\android_companion_app\src\main\res" >nul 2>&1
)
xcopy "d:\AG Projects\whatsapp-crm\flutter_sim_app\android\app\src\main\res" "d:\AG Projects\whatsapp-crm\android_companion_app\src\main\res" /E /I /H /Y >nul
echo Resources synced successfully!

cd /d "d:\AG Projects\whatsapp-crm\android_companion_app"
echo Building native debug APK...
call gradlew.bat assembleDebug
echo.
if exist "build\outputs\apk\debug\OmniFlowSIMRecorder-debug.apk" (
    echo ========================================================
    echo 🎉 SUCCESS! Companion APK Built Successfully!
    echo APK Path: d:\AG Projects\whatsapp-crm\android_companion_app\build\outputs\apk\debug\OmniFlowSIMRecorder-debug.apk
    echo ========================================================
    explorer "build\outputs\apk\debug"
) else (
    echo ❌ BUILD FAILED: Review the Gradle compilation logs above.
)
pause
