# Deploy to Render

## Steps:

1. **Push code to GitHub**
   - Create a GitHub repository
   - Push your bot code to it

2. **Connect to Render**
   - Go to render.com
   - Sign up/login with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure deployment**
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Environment: Node

4. **Set environment variables**
   - In Render dashboard, go to Environment
   - Add your variables:
     - `BOT_TOKEN`
     - `MONGO_URI`
     - `ADMIN_CHAT_ID`

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy

## Pricing:
- Free tier: Available with some limitations
- Paid: $7/month for more resources

## Auto-deployment:
- Automatically redeploys when you push to GitHub
