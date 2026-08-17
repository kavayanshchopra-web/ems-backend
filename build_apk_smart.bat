@echo off
title OmniFlow APK Builder
color 0A

echo.
echo  ====================================================
echo   OMNIFLOW APK BUILDER - Auto Fix + Build
echo  ====================================================
echo.

:: -------------------------------------------------------
:: STEP 1: Find Java JDK
:: -------------------------------------------------------
echo [1/5] Looking for Java JDK...

set JAVA_HOME=
if exist "C:\jdk17\bin\java.exe" (
    set "JAVA_HOME=C:\jdk17"
    goto :JAVA_FOUND
)

for /d %%D in ("C:\Program Files\Java\jdk*") do (
    if exist "%%D\bin\java.exe" ( set "JAVA_HOME=%%D" & goto :JAVA_FOUND )
)
for /d %%D in ("C:\Program Files\Eclipse Adoptium\jdk*") do (
    if exist "%%D\bin\java.exe" ( set "JAVA_HOME=%%D" & goto :JAVA_FOUND )
)
for /d %%D in ("C:\Program Files\Microsoft\jdk*") do (
    if exist "%%D\bin\java.exe" ( set "JAVA_HOME=%%D" & goto :JAVA_FOUND )
)

:: Download JDK if not found
echo     Java not found. Downloading OpenJDK 17 (~170MB)...
curl.exe -L --progress-bar "https://aka.ms/download-jdk/microsoft-jdk-17.0.11-windows-x64.zip" -o "C:\jdk17.zip"
mkdir "C:\jdk17" 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive 'C:\jdk17.zip' 'C:\jdk17_ex' -Force; $s=Get-ChildItem 'C:\jdk17_ex' -Dir | Select -First 1; Copy-Item ($s.FullName+'\*') 'C:\jdk17' -Recurse -Force"
set "JAVA_HOME=C:\jdk17"

:JAVA_FOUND
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo     Java ready: %JAVA_HOME%
echo.

:: -------------------------------------------------------
:: STEP 2: Generate App Icons
:: -------------------------------------------------------
echo [2/5] Creating Android app icons...
powershell -NoProfile -ExecutionPolicy Bypass -File "d:\AG Projects\whatsapp-crm\create_icons.ps1"
echo.

:: -------------------------------------------------------
:: STEP 3: Find Flutter
:: -------------------------------------------------------
echo [3/5] Looking for Flutter SDK...

set FLUTTER_BIN=
if exist "C:\flutter\flutter\bin\flutter.bat" (
    set "FLUTTER_BIN=C:\flutter\flutter\bin"
    goto :FLUTTER_FOUND
)
if exist "C:\flutter\bin\flutter.bat" (
    set "FLUTTER_BIN=C:\flutter\bin"
    goto :FLUTTER_FOUND
)

:: Check if flutter.zip exists already
for %%Z in (
    "d:\AG Projects\whatsapp-crm\flutter_sim_app\flutter.zip"
    "d:\AG Projects\whatsapp-crm\flutter.zip"
    "C:\flutter_dl.zip"
) do (
    if exist "%%Z" (
        echo     Found zip at %%Z. Extracting...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%%Z' -DestinationPath 'C:\flutter' -Force"
        goto :CHECK_FLUTTER
    )
)

echo     Downloading Flutter SDK (~700MB)...
curl.exe -L --progress-bar "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.22.2-stable.zip" -o "C:\flutter_dl.zip"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive 'C:\flutter_dl.zip' 'C:\flutter' -Force"

:CHECK_FLUTTER
if exist "C:\flutter\flutter\bin\flutter.bat" set "FLUTTER_BIN=C:\flutter\flutter\bin"
if exist "C:\flutter\bin\flutter.bat" set "FLUTTER_BIN=C:\flutter\bin"
if "%FLUTTER_BIN%"=="" ( echo ERROR: Flutter not found after extraction! & pause & exit /b 1 )

:FLUTTER_FOUND
set "PATH=%FLUTTER_BIN%;%PATH%"
echo     Flutter ready: %FLUTTER_BIN%
echo.

:: -------------------------------------------------------
:: STEP 4: Flutter pub get
:: -------------------------------------------------------
echo [4/5] Getting Flutter packages...
cd /d "d:\AG Projects\whatsapp-crm\flutter_sim_app"
call "%FLUTTER_BIN%\flutter.bat" pub get
echo.

:: -------------------------------------------------------
:: STEP 5: Build APK
:: -------------------------------------------------------
echo [5/5] Building Release APK (3-5 minutes)...
call "%FLUTTER_BIN%\flutter.bat" build apk --release
echo.

:: -------------------------------------------------------
:: RESULT
:: -------------------------------------------------------
if exist "build\app\outputs\flutter-apk\app-release.apk" (
    echo  ====================================================
    echo   SUCCESS! APK is ready!
    echo   Location: d:\AG Projects\whatsapp-crm\flutter_sim_app\build\app\outputs\flutter-apk\app-release.apk
    echo  ====================================================
    explorer "build\app\outputs\flutter-apk"
) else (
    echo  ====================================================
    echo   BUILD FAILED - See error above
    echo  ====================================================
)
echo.
pause
