@echo off
echo 🤖 Setting up Telegram Chat Bot...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found

REM Install requirements
echo.
echo 📦 Installing requirements...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install requirements
    pause
    exit /b 1
)

echo ✅ Requirements installed

REM Check if .env exists
if exist .env (
    echo ⚠️  .env file already exists
    goto :run_setup
)

echo.
echo 📝 Creating environment file...
echo You need to get a bot token from @BotFather on Telegram
echo 1. Message @BotFather on Telegram
echo 2. Use /newbot command  
echo 3. Follow instructions to create your bot
echo 4. Copy the bot token
echo.

set /p token="Enter your bot token: "

if "%token%"=="" (
    echo ❌ Bot token is required!
    pause
    exit /b 1
)

echo TELEGRAM_BOT_TOKEN=%token%> .env
echo DATABASE_URL=chat_bot.db>> .env

echo ✅ Environment file created!

:run_setup
echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Make sure your bot token is correct in .env file
echo 2. Run: python main.py
echo 3. Start chatting with your bot on Telegram!
echo.
echo Bot commands:
echo - /start - Register and create profile
echo - /find - Find someone to chat with  
echo - /help - Show help
echo.

echo Would you like to start the bot now? (y/n)
set /p start_now=""

if /i "%start_now%"=="y" (
    echo Starting bot...
    python main.py
)

pause
