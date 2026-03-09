@echo off
echo Killing all Electron processes...
taskkill /F /IM electron.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo Removing electron directory...
rd /s /q node_modules\electron 2>nul
if exist node_modules\electron (
    echo Failed to remove electron directory
    echo Please close any applications using Electron and try again
    pause
    exit /b 1
)

echo Successfully removed electron directory
echo Reinstalling Electron...
call npm install electron@33.2.0 --save-exact

echo Done!
pause
