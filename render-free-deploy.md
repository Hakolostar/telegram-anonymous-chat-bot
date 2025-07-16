# 🎨 Deploy Your Bot to Render (FREE) - Step by Step

## Why Render?
- ✅ Completely FREE tier
- ✅ No credit card required
- ✅ 750 hours/month free compute (enough for 24/7)
- ✅ Auto-deploy from GitHub
- ✅ Easy to use

---

## Step 1: Prepare Your Code for GitHub

### 1.1 Initialize Git (if not done already)
```bash
cd "c:\Users\USER\Music\Were"
git init
```

### 1.2 Create .gitignore file
Create a file called `.gitignore` with this content:
```
node_modules/
.env
*.log
.DS_Store
```

### 1.3 Commit your code
```bash
git add .
git commit -m "Initial commit - Anonymous Chat Bot"
```

---

## Step 2: Push to GitHub

### 2.1 Create GitHub Repository
1. Go to github.com
2. Click "New repository"
3. Name it: `telegram-anonymous-chat-bot`
4. Make it **Public** (required for free Render)
5. Click "Create repository"

### 2.2 Push your code
```bash
git remote add origin https://github.com/YOUR_USERNAME/telegram-anonymous-chat-bot.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Render

### 3.1 Create Render Account
1. Go to render.com
2. Click "Get Started"
3. Sign up with GitHub (easiest)

### 3.2 Create Web Service
1. In Render dashboard, click "New +"
2. Select "Web Service"
3. Click "Connect" next to your GitHub repository
4. Click "Connect" to authorize

### 3.3 Configure Service
Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `anonymous-chat-bot` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node index.js` |
| **Plan** | `Free` |

### 3.4 Add Environment Variables
Click "Advanced" → "Add Environment Variable":

| Variable | Value | Notes |
|----------|-------|-------|
| `BOT_TOKEN` | Your bot token from @BotFather | Starts with numbers:letters |
| `MONGO_URI` | Your MongoDB connection string | mongodb+srv://... |
| `ADMIN_CHAT_ID` | Your Telegram user ID | Optional, numbers only |

### 3.5 Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Watch the logs for any errors

---

## Step 4: Verify Deployment

### 4.1 Check Logs
- In Render dashboard, go to your service
- Click "Logs" tab
- Look for: "✅ Bot started successfully!"

### 4.2 Test Your Bot
- Message your bot on Telegram
- It should respond within seconds
- Try creating a profile and finding matches

---

## Step 5: Set Up Auto-Deploy (Optional)

Render automatically redeploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update bot features"
git push
```

Render will automatically redeploy your bot!

---

## 🆓 Free Tier Limits

Render Free includes:
- ✅ 750 hours/month (31 days × 24 hours = 744 hours)
- ✅ 512MB RAM
- ✅ Shared CPU
- ✅ Auto-sleep after 15 minutes of inactivity
- ✅ Auto-wake when bot receives message

**Note:** Your bot will "sleep" after 15 minutes of no activity, but automatically wakes up when someone messages it. First response might take 10-30 seconds.

---

## 📊 Free Database Options

Since you're going free, consider these database options:

### MongoDB Atlas (FREE)
1. Go to mongodb.com/atlas
2. Create free account
3. Create free cluster (512MB)
4. Get connection string
5. Use as `MONGO_URI`

### Upstash Redis (FREE)
1. Go to upstash.com
2. Create free account
3. Create Redis database
4. Get connection URL
5. Use as `REDIS_URL`

---

## 🔧 Troubleshooting

### Bot doesn't respond?
1. Check Render logs for errors
2. Verify environment variables are set correctly
3. Make sure MongoDB is accessible
4. Check bot token is valid

### First response slow?
- Normal! Free tier sleeps after 15 minutes
- Subsequent responses will be fast
- Consider upgrading to paid plan if needed

### Deployment failed?
- Check build logs in Render
- Ensure all dependencies are in package.json
- Verify start command is correct

---

## ✅ Success Checklist

- [ ] Code pushed to GitHub
- [ ] Render service created
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] Bot responds on Telegram
- [ ] No errors in logs

---

## 🚀 Your Bot is Now Live 24/7 on Render!

**Deployment URL:** Your bot will be available at `https://your-service-name.onrender.com`

**Cost:** $0/month (completely free!)

**Next Steps:**
- Monitor usage in Render dashboard
- Add more features to your bot
- Consider upgrading if you need faster response times

---

## 💡 Pro Tips

1. **Keep GitHub repo updated** - Render auto-deploys from GitHub
2. **Monitor logs** - Check for errors regularly
3. **Use free database** - MongoDB Atlas or Upstash Redis
4. **Test locally first** - Always test changes before pushing
5. **Backup your code** - GitHub serves as your backup

Your Anonymous Chat Bot is now running 24/7 for FREE! 🎉
