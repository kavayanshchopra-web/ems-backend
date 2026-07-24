@echo off
title OmniFlow SIM Recorder - Automatic APK Builder

echo ========================================================
echo OMNIFLOW TELECALLING - AUTOMATIC APK BUILDER
echo ========================================================
echo.

cd /d "d:\AG Projects\whatsapp-crm\flutter_sim_app"
echo Current Directory: %CD%
echo.

:: 1. CHECK FOR EXISTING JAVA JDK
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" goto :JDK_READY

for /d %%D in ("C:\Program Files\Java\jdk*" "C:\Program Files\Microsoft\jdk*" "C:\Program Files\Eclipse Adoptium\jdk*" "C:\jdk17\*" "C:\jdk17") do (
    if exist "%%D\bin\java.exe" (
        set "JAVA_HOME=%%D"
        set "PATH=%%D\bin;%PATH%"
        echo Found Java JDK at %%D
        goto :JDK_READY
    )
)

echo Java JDK not found on system. Downloading portable OpenJDK 17 via curl.exe...
curl.exe -L "https://aka.ms/download-jdk/microsoft-jdk-17.0.10-windows-x64.zip" -o "jdk17.zip"

if not exist "jdk17.zip" (
    echo Error: Failed to download OpenJDK zip. Please check internet connection.
    pause
    exit /b 1
)

echo Extracting OpenJDK 17 to C:\jdk17...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path 'jdk17.zip' -DestinationPath 'C:\jdk17_temp' -Force"
for /d %%I in ("C:\jdk17_temp\*") do xcopy "%%I" "C:\jdk17\" /E /I /H /Y >nul
set "JAVA_HOME=C:\jdk17"
set "PATH=C:\jdk17\bin;%PATH%"

:JDK_READY
echo JAVA_HOME is set to: %JAVA_HOME%

:: 2. CHECK FOR FLUTTER SDK
if exist "C:\flutter\flutter\bin\flutter.bat" (
    echo Flutter SDK found in C:\flutter!
    set "PATH=C:\flutter\flutter\bin;C:\flutter\bin;C:\flutter\flutter\bin\cache\dart-sdk\bin;%PATH%"
    goto :BUILD_APK
)

if exist "C:\flutter\bin\flutter.bat" (
    echo Flutter SDK found in C:\flutter\bin!
    set "PATH=C:\flutter\bin;C:\flutter\bin\cache\dart-sdk\bin;%PATH%"
    goto :BUILD_APK
)

echo Checking Flutter installation...
where flutter >nul 2>&1
if %errorlevel% equ 0 goto :BUILD_APK

if exist "flutter.zip" (
    echo flutter.zip already exists. Extracting...
    goto :EXTRACT_ZIP
)

echo Downloading Flutter SDK via curl.exe...
curl.exe -L "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.22.2-stable.zip" -o "flutter.zip"

:EXTRACT_ZIP
echo Extracting Flutter SDK to C:\flutter (this takes 1 min)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path 'flutter.zip' -DestinationPath 'C:\flutter' -Force"
set "PATH=C:\flutter\flutter\bin;C:\flutter\bin;C:\flutter\flutter\bin\cache\dart-sdk\bin;%PATH%"

:BUILD_APK
set "PATH=C:\flutter\flutter\bin;C:\flutter\bin;C:\flutter\flutter\bin\cache\dart-sdk\bin;%PATH%"
echo.
echo [2/3] Fetching Flutter packages...
call flutter pub get

echo.
echo [3/3] Building Android Release APK...
call flutter build apk --release

echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo 🎉 SUCCESS! APK BUILT SUCCESSFULLY!
    echo APK Path: d:\AG Projects\whatsapp-crm\flutter_sim_app\build\app\outputs\flutter-apk\app-release.apk
    echo ========================================================
) else (
    echo ❌ BUILD ERROR: Please review logs above.
)
echo.
pause
