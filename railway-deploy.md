# Deploy to Railway

## Steps:

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize project**
   ```bash
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Set environment variables in Railway dashboard**
   - Go to your project on railway.app
   - Go to Variables tab
   - Add your environment variables:
     - `BOT_TOKEN`
     - `MONGO_URI` 
     - `ADMIN_CHAT_ID`

## Pricing:
- Free tier: $5 credit monthly (usually enough for small bots)
- Paid: $5/month for more resources

## Files needed:
- Your `index.js` file
- `package.json`
- `.env` (for local development only)
