@echo off
setlocal enabledelayedexpansion

if defined ANDROID_HOME (
    set "EMU_DIR=%ANDROID_HOME%\emulator"
) else (
    set "EMU_DIR=%LOCALAPPDATA%\Android\Sdk\emulator"
)

set "EMU_EXE=%EMU_DIR%\emulator.exe"

if not exist "%EMU_EXE%" (
    echo [ERROR] Khong tim thay Android Emulator tai: "%EMU_EXE%"
    echo Vui long kiem tra lai duong dan Android SDK.
    pause
    exit /b 1
)

set "AVD_NAME=Pixel_6"
if not "%~1"=="" set "AVD_NAME=%~1"

:: Xoa file lock ton dong neu co tu lan chay truoc
if exist "%USERPROFILE%\.android\avd\%AVD_NAME%.avd\*.lock" (
    del /f /q "%USERPROFILE%\.android\avd\%AVD_NAME%.avd\*.lock" >nul 2>&1
    rd /s /q "%USERPROFILE%\.android\avd\%AVD_NAME%.avd\hardware-qemu.ini.lock" >nul 2>&1
)

echo ========================================================
echo   Dang bat may ao Android: %AVD_NAME%
echo ========================================================

pushd "%EMU_DIR%"
start "" emulator.exe -avd %AVD_NAME%
popd

echo Cua so may ao da duoc mo!
exit /b 0
