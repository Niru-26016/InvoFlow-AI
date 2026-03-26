@echo off
echo ========================================
echo  InvoFlow-AI - Installing Dependencies
echo ========================================
echo.
cd /d "%~dp0"
echo Installing npm packages...
npm install
echo.
echo ========================================
echo  All dependencies installed!
echo  Run "npm run dev" to start the app.
echo ========================================
pause
