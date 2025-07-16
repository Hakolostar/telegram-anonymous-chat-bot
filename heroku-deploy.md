# Deploy to Heroku

## Steps:

1. **Install Heroku CLI**
   Download from: https://devcenter.heroku.com/articles/heroku-cli

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku app**
   ```bash
   heroku create your-bot-name
   ```

4. **Set environment variables**
   ```bash
   heroku config:set BOT_TOKEN=your_bot_token
   heroku config:set MONGO_URI=your_mongodb_uri
   heroku config:set ADMIN_CHAT_ID=your_admin_id
   ```

5. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy bot"
   git push heroku main
   ```

6. **Scale the dyno**
   ```bash
   heroku ps:scale worker=1
   ```

## Pricing:
- Free tier: 550-1000 hours/month (enough for 24/7)
- Paid: $7/month for more resources

## Required files:
- `Procfile` (create this file)
- `package.json`
- Your bot code
