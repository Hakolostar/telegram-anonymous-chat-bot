# 🚀 Deploy to Render (FREE) - Quick Start

## TL;DR - 5 Minute Deploy

1. **Run the deployment script:**
   ```bash
   deploy-render.bat
   ```

2. **Create GitHub repo** (public, free requirement)

3. **Push code to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/telegram-anonymous-chat-bot.git
   git branch -M main
   git push -u origin main
   ```

4. **Deploy on Render:**
   - Go to render.com → Sign up with GitHub
   - New + → Web Service → Connect your repo
   - Build: `npm install` | Start: `node index.js`
   - Add env vars: `BOT_TOKEN`, `MONGO_URI`, `ADMIN_CHAT_ID`
   - Deploy!

5. **Your bot is live 24/7 for FREE! 🎉**

---

## Why Render?

- ✅ **Completely FREE** (no credit card needed)
- ✅ **750 hours/month** (more than enough for 24/7)
- ✅ **Auto-deploy** from GitHub
- ✅ **Easy setup** (5 minutes)
- ⚠️ **Sleeps after 15min** (auto-wakes on message)

---

## Environment Variables Needed

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | From @BotFather | `1234567890:ABC...` |
| `MONGO_URI` | Database connection | `mongodb+srv://...` |
| `ADMIN_CHAT_ID` | Your Telegram ID | `123456789` |

---

## Free Database Options

### MongoDB Atlas (Recommended)
- 512MB free forever
- Go to mongodb.com/atlas
- Create cluster → Get connection string

### Upstash Redis
- 10,000 commands/day free
- Go to upstash.com
- Create database → Get URL

---

## Files Ready for Deployment

- ✅ `index.js` - Your bot code
- ✅ `package.json` - Dependencies  
- ✅ `Procfile` - Deployment config
- ✅ `.gitignore` - Security
- ✅ `deploy-render.bat` - Deployment helper

---

## Troubleshooting

**Bot not responding?**
- Check Render logs for errors
- Verify environment variables
- Ensure MongoDB is accessible

**Slow first response?**
- Normal! Free tier sleeps after 15min
- Subsequent responses are fast

**Need help?**
- Check `render-free-deploy.md` for detailed guide
- Review Render logs for specific errors

---

## 🎯 Quick Commands

```bash
# Check deployment readiness
node check-deployment.js

# Start deployment process  
deploy-render.bat

# Push updates (auto-redeploys)
git add .
git commit -m "Update bot"
git push
```

**Your Anonymous Chat Bot will be live 24/7 for $0! 🚀**
