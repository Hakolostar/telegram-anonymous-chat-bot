@echo off
echo 🤖 Telegram Anonymous Chat Bot - Windows Setup
echo ===============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js 16+ from https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found

REM Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed
echo.

REM Run setup script
echo 🔧 Running configuration setup...
node setup.js

echo.
echo 🎯 Setup complete! 
echo.
echo Next steps:
echo 1. Edit .env file with your bot token
echo 2. Run: npm start
echo.

pause
