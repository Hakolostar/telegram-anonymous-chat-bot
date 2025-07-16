#!/bin/bash

echo "🚀 Anonymous Chat Bot - Quick Deploy Script"
echo "=========================================="

echo ""
echo "Choose your deployment platform:"
echo "1) Railway (Recommended - Easy)"
echo "2) Heroku (Classic)"
echo "3) Render (Modern)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
  1)
    echo ""
    echo "🚂 Deploying to Railway..."
    echo ""
    echo "1. Install Railway CLI:"
    echo "   npm install -g @railway/cli"
    echo ""
    echo "2. Login to Railway:"
    echo "   railway login"
    echo ""
    echo "3. Initialize and deploy:"
    echo "   railway init"
    echo "   railway up"
    echo ""
    echo "4. Set environment variables in Railway dashboard:"
    echo "   - BOT_TOKEN (your bot token)"
    echo "   - MONGO_URI (your MongoDB connection string)"
    echo "   - ADMIN_CHAT_ID (your Telegram user ID)"
    echo ""
    echo "✅ Your bot will be live 24/7!"
    ;;
  2)
    echo ""
    echo "🔺 Deploying to Heroku..."
    echo ""
    echo "1. Install Heroku CLI from heroku.com"
    echo ""
    echo "2. Login and create app:"
    echo "   heroku login"
    echo "   heroku create your-bot-name"
    echo ""
    echo "3. Set environment variables:"
    echo "   heroku config:set BOT_TOKEN=your_bot_token"
    echo "   heroku config:set MONGO_URI=your_mongodb_uri"
    echo "   heroku config:set ADMIN_CHAT_ID=your_admin_id"
    echo ""
    echo "4. Deploy:"
    echo "   git add ."
    echo "   git commit -m 'Deploy bot'"
    echo "   git push heroku main"
    echo "   heroku ps:scale worker=1"
    echo ""
    echo "✅ Your bot will be live 24/7!"
    ;;
  3)
    echo ""
    echo "🎨 Deploying to Render..."
    echo ""
    echo "1. Push your code to GitHub"
    echo "2. Go to render.com and connect your GitHub repo"
    echo "3. Set build command: npm install"
    echo "4. Set start command: node index.js"
    echo "5. Add environment variables in Render dashboard"
    echo ""
    echo "✅ Your bot will be live 24/7!"
    ;;
  *)
    echo "Invalid choice. Please run the script again."
    ;;
esac

echo ""
echo "📊 Free Database Options:"
echo "- MongoDB Atlas: mongodb.com/atlas (512MB free)"
echo "- Upstash Redis: upstash.com (10k commands/day free)"
echo ""
echo "💡 Need help? Check DEPLOYMENT.md for detailed instructions!"
