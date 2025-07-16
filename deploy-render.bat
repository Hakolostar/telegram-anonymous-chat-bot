@echo off
title Deploy to Render - Free Hosting

echo 🎨 Anonymous Chat Bot - Render Deployment (FREE)
echo ================================================
echo.

echo This script will help you deploy your bot to Render for FREE!
echo.
echo ✅ Prerequisites Check:
echo □ GitHub account
echo □ Bot tested locally
echo □ MongoDB database ready
echo.
set /p ready="Are you ready to deploy? (y/n): "

if /i "%ready%" neq "y" (
    echo.
    echo 📚 Please complete the prerequisites first!
    echo 💡 Check render-free-deploy.md for detailed instructions.
    pause
    exit /b
)

echo.
echo 🚀 Starting deployment process...
echo.

echo Step 1: Initialize Git (if needed)
git status >nul 2>&1
if errorlevel 1 (
    echo Initializing Git repository...
    git init
    echo ✅ Git initialized
) else (
    echo ✅ Git already initialized
)

echo.
echo Step 2: Adding files to Git
git add .
git status

echo.
echo Step 3: Committing changes
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Deploy Anonymous Chat Bot to Render

git commit -m "%commit_msg%"

echo.
echo ✅ Code committed locally!
echo.
echo 📋 Next Steps (Manual):
echo.
echo 1. Create GitHub repository:
echo    - Go to github.com
echo    - Click "New repository"
echo    - Name: telegram-anonymous-chat-bot
echo    - Make it PUBLIC (required for free Render)
echo    - Click "Create repository"
echo.
echo 2. Push your code to GitHub:
echo    Replace YOUR_USERNAME with your GitHub username:
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/telegram-anonymous-chat-bot.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Deploy to Render:
echo    - Go to render.com
echo    - Sign up with GitHub
echo    - Click "New +" → "Web Service"
echo    - Connect your GitHub repository
echo    - Set Build Command: npm install
echo    - Set Start Command: node index.js
echo    - Add environment variables:
echo      * BOT_TOKEN (your bot token)
echo      * MONGO_URI (your MongoDB connection)
echo      * ADMIN_CHAT_ID (your Telegram ID)
echo    - Click "Create Web Service"
echo.
echo 📖 For detailed instructions, see: render-free-deploy.md
echo.
echo 🎉 Your bot will be live 24/7 for FREE!
echo.
pause
