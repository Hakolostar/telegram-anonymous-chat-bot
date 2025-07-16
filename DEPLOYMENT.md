# 🚀 Deployment Guide - Telegram Anonymous Chat Bot

This guide covers multiple deployment options for your Telegram Anonymous Chat Bot, from local development to production cloud deployment.

## 📋 Prerequisites

- Node.js 16+ installed
- Telegram Bot Token from [@BotFather](https://t.me/botfather)
- Database choice: MongoDB Atlas (recommended) or Redis

## 🏠 Local Development

### Quick Start

1. **Clone and Setup:**
```bash
git clone <your-repository>
cd telegram-anonymous-chat-bot
npm install
```

2. **Configure Environment:**
```bash
cp .env.example .env
# Edit .env with your values
```

3. **Run Setup Script:**
```bash
npm run setup
```

4. **Start Development:**
```bash
npm run dev  # Auto-reload on changes
```

### Manual Setup

1. **Install Dependencies:**
```bash
npm install
```

2. **Create `.env` file:**
```env
BOT_TOKEN=1234567890:ABCdef-GHIjklMNOpqrsTUVwxyz
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/chatbot
REDIS_URL=redis://localhost:6379
ADMIN_CHAT_ID=-1001234567890
```

3. **Test Configuration:**
```bash
npm test
```

4. **Start Bot:**
```bash
npm start
```

## ☁️ Cloud Deployment

### Option 1: Heroku (Easiest)

#### Step 1: Prepare Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create your-bot-name
```

#### Step 2: Configure Environment

```bash
# Set bot token
heroku config:set BOT_TOKEN=your_bot_token_here

# Set database (MongoDB Atlas recommended)
heroku config:set MONGO_URI=mongodb+srv://user:pass@cluster.net/db

# Set admin chat ID
heroku config:set ADMIN_CHAT_ID=your_admin_chat_id
```

#### Step 3: Deploy

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Deploy to Heroku
git push heroku main

# Check logs
heroku logs --tail
```

#### Step 4: Verify

```bash
# Check app status
heroku ps

# Open app logs
heroku logs --app your-bot-name
```

### Option 2: Railway

#### Step 1: Setup Railway

1. Go to [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Create new project from GitHub repo

#### Step 2: Environment Variables

In Railway dashboard:
- Add `BOT_TOKEN`
- Add `MONGO_URI` or `REDIS_URL`
- Add `ADMIN_CHAT_ID`

#### Step 3: Deploy

Railway auto-deploys on git push to main branch.

### Option 3: DigitalOcean Droplet

#### Step 1: Create Droplet

```bash
# Create Ubuntu 20.04 droplet
# SSH into your droplet
ssh root@your-droplet-ip
```

#### Step 2: Setup Environment

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Create app directory
mkdir /var/www/chatbot
cd /var/www/chatbot
```

#### Step 3: Deploy Application

```bash
# Clone your repository
git clone <your-repo-url> .

# Install dependencies
npm install --production

# Create .env file
nano .env
# Add your environment variables

# Test the bot
npm test
```

#### Step 4: Setup PM2

```bash
# Start bot with PM2
pm2 start index.js --name "telegram-bot"

# Setup auto-restart on boot
pm2 startup
pm2 save

# Monitor logs
pm2 logs telegram-bot
```

#### Step 5: Setup Nginx (Optional)

```bash
# Install Nginx
apt install nginx

# Create config file
nano /etc/nginx/sites-available/chatbot

# Add basic config for health checks
server {
    listen 80;
    server_name your-domain.com;
    
    location /health {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}

# Enable site
ln -s /etc/nginx/sites-available/chatbot /etc/nginx/sites-enabled/
systemctl restart nginx
```

### Option 4: Google Cloud Platform

#### Step 1: Setup GCP

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Login and create project
gcloud auth login
gcloud projects create your-project-id
gcloud config set project your-project-id
```

#### Step 2: Create app.yaml

```yaml
runtime: nodejs16

env_variables:
  BOT_TOKEN: "your_bot_token"
  MONGO_URI: "your_mongo_uri"
  ADMIN_CHAT_ID: "your_admin_id"

automatic_scaling:
  min_instances: 1
  max_instances: 10
```

#### Step 3: Deploy

```bash
# Deploy to App Engine
gcloud app deploy

# View logs
gcloud app logs tail -s default
```

### Option 5: AWS EC2

#### Step 1: Launch EC2 Instance

1. Launch Ubuntu 20.04 t2.micro instance
2. Configure security group (allow SSH)
3. Download key pair

#### Step 2: Connect and Setup

```bash
# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update and install Node.js
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

#### Step 3: Deploy App

```bash
# Clone repository
git clone <your-repo>
cd telegram-anonymous-chat-bot

# Install dependencies
npm install --production

# Setup environment
nano .env
# Add your variables

# Start with PM2
pm2 start index.js --name chatbot
pm2 startup
pm2 save
```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

#### Step 1: Create Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create account and new cluster
3. Choose free tier (M0)
4. Select region closest to your users

#### Step 2: Configure Access

1. **Database User:**
   - Database Access → Add New Database User
   - Create username/password
   - Grant read/write access

2. **Network Access:**
   - Network Access → Add IP Address
   - Allow access from anywhere: `0.0.0.0/0`

#### Step 3: Get Connection String

1. Clusters → Connect → Connect your application
2. Copy connection string
3. Replace `<password>` and `<dbname>`

```env
MONGO_URI=mongodb+srv://username:password@cluster0.xyz.mongodb.net/chatbot?retryWrites=true&w=majority
```

### Redis Setup

#### Option 1: Redis Cloud

1. Go to [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
2. Create free account
3. Create database
4. Get connection details

```env
REDIS_URL=redis://username:password@host:port
```

#### Option 2: Local Redis

```bash
# Install Redis locally
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis

# Start Redis
redis-server

# Test connection
redis-cli ping
```

```env
REDIS_URL=redis://localhost:6379
```

#### Option 3: Docker Redis

```bash
# Run Redis in Docker
docker run -d --name redis -p 6379:6379 redis:alpine
```

## 🔧 Production Configuration

### Environment Variables

```env
# Required
BOT_TOKEN=your_telegram_bot_token

# Database (choose one)
MONGO_URI=mongodb+srv://user:pass@cluster.net/db
REDIS_URL=redis://user:pass@host:port

# Optional
ADMIN_CHAT_ID=your_admin_chat_id
NODE_ENV=production
```

### Performance Optimization

#### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'telegram-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

Start with:
```bash
pm2 start ecosystem.config.js --env production
```

#### Memory Management

```javascript
// Add to index.js for memory monitoring
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory:', {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB'
  });
}, 300000); // Every 5 minutes
```

### Monitoring & Logs

#### Log Management

```bash
# PM2 log rotation
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

#### Health Checks

Add to your bot:

```javascript
// Health check endpoint for monitoring
bot.telegram.setWebhook = async function() {
  // Custom webhook for health checks
  return true;
};

// Add periodic health check
setInterval(async () => {
  try {
    await bot.telegram.getMe();
    console.log('Health check: Bot is responsive');
  } catch (error) {
    console.error('Health check failed:', error);
  }
}, 60000); // Every minute
```

## 🛡️ Security Best Practices

### Environment Security

```bash
# Set proper file permissions
chmod 600 .env

# Don't commit .env file
echo ".env" >> .gitignore
```

### Bot Security

1. **Keep Token Secret:**
   - Never commit bot token to git
   - Use environment variables only
   - Regenerate if compromised

2. **Input Validation:**
   - Already implemented in the bot
   - Content filtering active
   - Rate limiting on commands

3. **Database Security:**
   - Use connection strings with authentication
   - Enable database firewall rules
   - Regular backups

### Network Security

```bash
# Setup UFW firewall (Ubuntu)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# For Nginx
sudo ufw allow 'Nginx Full'
```

## 📊 Monitoring & Analytics

### Basic Monitoring

Add to your bot:

```javascript
// Usage statistics
let stats = {
  users: 0,
  matches: 0,
  messages: 0
};

// Track usage
bot.use((ctx, next) => {
  stats.messages++;
  return next();
});

// Periodic stats report
setInterval(() => {
  console.log('Bot Stats:', stats);
  // Optionally send to admin
}, 3600000); // Every hour
```

### Advanced Monitoring

1. **Application Performance Monitoring:**
   - New Relic
   - DataDog
   - Sentry for error tracking

2. **Database Monitoring:**
   - MongoDB Atlas built-in monitoring
   - Redis monitoring tools

3. **Server Monitoring:**
   - htop, iotop for system resources
   - Custom dashboard with metrics

## 🚨 Troubleshooting

### Common Issues

#### Bot Not Responding

```bash
# Check bot token
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# Check logs
pm2 logs telegram-bot

# Restart bot
pm2 restart telegram-bot
```

#### Database Connection Issues

```bash
# Test MongoDB connection
mongosh "your_connection_string"

# Test Redis connection
redis-cli -u "your_redis_url" ping
```

#### Memory Issues

```bash
# Check memory usage
pm2 monit

# Restart if high memory
pm2 restart telegram-bot
```

### Debug Mode

```bash
# Enable debug logs
DEBUG=telegraf:* npm start

# Or set in .env
DEBUG=telegraf:*
```

### Performance Issues

1. **High CPU Usage:**
   - Check for infinite loops
   - Optimize database queries
   - Implement caching

2. **High Memory Usage:**
   - Check for memory leaks
   - Implement garbage collection
   - Restart periodically

3. **Slow Response:**
   - Optimize database indexes
   - Use connection pooling
   - Implement caching

## 📈 Scaling

### Horizontal Scaling

```javascript
// Load balancer configuration
module.exports = {
  apps: [{
    name: 'telegram-bot',
    script: 'index.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster'
  }]
};
```

### Database Scaling

1. **MongoDB:**
   - Upgrade to dedicated cluster
   - Enable sharding if needed
   - Use read replicas

2. **Redis:**
   - Use Redis Cluster
   - Implement data partitioning
   - Add Redis Sentinel for HA

### CDN & Caching

```javascript
// Implement Redis caching
const redis = require('redis');
const client = redis.createClient();

// Cache user profiles
async function getCachedUser(userId) {
  const cached = await client.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);
  
  const user = await getUserFromDB(userId);
  await client.setex(`user:${userId}`, 3600, JSON.stringify(user));
  return user;
}
```

## 🎯 Next Steps

After successful deployment:

1. **Test All Features:**
   - User registration
   - Profile matching
   - Message forwarding
   - Admin commands

2. **Monitor Performance:**
   - Set up alerts
   - Monitor error rates
   - Track user engagement

3. **Plan Updates:**
   - Version control strategy
   - Zero-downtime deployments
   - Feature rollout plan

4. **Backup Strategy:**
   - Database backups
   - Configuration backups
   - Disaster recovery plan

---

**🎉 Congratulations!** Your Telegram Anonymous Chat Bot is now deployed and ready to connect strangers around the world!

For support, check the main README.md or create an issue in the repository.
