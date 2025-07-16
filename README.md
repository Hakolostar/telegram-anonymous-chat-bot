# 🤖 Telegram Anonymous Chat Bot

A sophisticated Telegram bot built with Node.js and Telegraf v4 that matches strangers anonymously based on profile similarity and shared interests.

## 🌟 Features

### 👤 User Profile & Preferences
- **Age**: Numeric input (13-100)
- **Gender**: Male, Female, Other
- **Education**: High School, Bachelor, Master, PhD, Other
- **Interests**: Multi-select from 20+ categories (tech, music, travel, politics, etc.)
- **Preferred Gender**: Any, Male only, Female only
- **Language**: English, Spanish, French, Arabic, Amharic, Chinese, German, Italian, Portuguese, Russian, Other

### 🔍 Smart Matching Algorithm
- **Interest Compatibility**: +5 points for each shared interest
- **Age Compatibility**: +3 points for similar age ranges
- **Gender Preferences**: +5 points for mutual compatibility
- **Language Match**: +2 points for same language
- **Education Level**: +1 point for same education level
- **Mutual Preference Check**: Ensures both users meet each other's gender preferences

### 💬 Anonymous Message Relaying
- **Multi-Media Support**: Text, photos, voice notes, stickers, videos, documents
- **Content Filtering**: Automatic inappropriate content detection
- **Identity Protection**: Complete anonymity maintained
- **Real-time Forwarding**: Instant message delivery between matched users

### 🎮 Interactive Commands
- `/start` - Create or reset profile with interactive setup wizard
- `/profile` - View and manage user profile with inline keyboards
- `/find` - Smart matching with compatibility scoring
- `/next` - Leave current chat and find new partner
- `/stop` - End current chat session
- `/report` - Report inappropriate behavior to admins
- `/help` - Comprehensive help and feature guide

### 🛡️ Moderation & Safety
- **Admin Reporting**: All reports logged to designated admin chat
- **Content Filtering**: Bad words filter for text messages
- **User Banning**: Admin capability to ban problematic users
- **Graceful Disconnection**: Proper notification when partners leave

### 📊 Database Options
- **MongoDB**: Full-featured with indexing and scalability
- **Redis**: Fast in-memory storage for high performance
- **Memory Fallback**: Development mode with in-memory storage

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB Atlas account OR Redis instance
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` file:
```env
BOT_TOKEN=your_telegram_bot_token_here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/anonymous_chat_bot
REDIS_URL=redis://localhost:6379
ADMIN_CHAT_ID=your_admin_chat_id_here
```

3. **Start the bot:**
```bash
# Production
npm start

# Development with auto-reload
npm run dev
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `BOT_TOKEN` | Telegram Bot Token from @BotFather | ✅ | `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` |
| `MONGO_URI` | MongoDB connection string | ⚪ | `mongodb+srv://user:pass@cluster.net/db` |
| `REDIS_URL` | Redis connection URL | ⚪ | `redis://localhost:6379` |
| `ADMIN_CHAT_ID` | Admin chat ID for reports | ⚪ | `-1001234567890` |

**Note**: At least one database option (MONGO_URI or REDIS_URL) is recommended. The bot will fall back to in-memory storage if neither is provided.

### Getting Your Bot Token

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` command
3. Choose a name and username for your bot
4. Copy the provided token to your `.env` file

### Setting up MongoDB Atlas (Recommended)

1. Create account at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a new cluster
3. Get connection string from "Connect" → "Connect your application"
4. Replace `<password>` and `<dbname>` in the connection string
5. Add to `.env` as `MONGO_URI`

### Setting up Redis (Alternative)

1. **Local Redis:**
```bash
# Install Redis locally
redis-server
```

2. **Cloud Redis (Upstash, Redis Cloud, etc.):**
```bash
# Get connection URL from your provider
REDIS_URL=redis://username:password@host:port
```

## 🏗️ Architecture

### Project Structure
```
├── index.js          # Main bot application
├── package.json      # Dependencies and scripts
├── .env             # Environment variables
├── .env.example     # Environment template
├── README.md        # This documentation
└── .gitignore       # Git ignore file
```

### Key Components

#### 🗄️ Database Operations (`DatabaseOperations` class)
- **User Management**: Profile creation, updates, and retrieval
- **Queue Management**: Waiting queue for unmatched users
- **Match Management**: Active chat session tracking
- **Multi-Database Support**: MongoDB, Redis, and in-memory fallback

#### 🎯 Matching Service (`MatchingService` class)
- **Compatibility Scoring**: Advanced algorithm considering multiple factors
- **Gender Compatibility**: Mutual preference validation
- **Best Match Selection**: Finds highest scoring compatible user

#### 🎭 Profile Setup Scene (`profileSetupScene`)
- **Interactive Wizard**: Step-by-step profile creation
- **Inline Keyboards**: User-friendly selection interfaces
- **Validation**: Input validation and error handling
- **State Management**: Session-based progress tracking

### 🔄 Matching Algorithm Details

The bot uses a sophisticated scoring system:

```javascript
// Base compatibility score calculation
let score = 0;

// Shared interests (highest weight)
sharedInterests.forEach(() => score += 5);

// Age compatibility
if (ageDifference <= 5) score += 3;
else if (ageDifference <= 10) score += 1;

// Language match
if (sameLanguage) score += 2;

// Education level
if (sameEducation) score += 1;

// Gender preference validation (mandatory)
if (!mutualGenderCompatibility) return -1; // Incompatible
```

### 💬 Message Flow

1. **User sends message** → Bot receives via Telegraf
2. **Active match check** → Verify user is in active chat
3. **Content filtering** → Check for inappropriate content
4. **Message forwarding** → Send to matched partner
5. **Error handling** → Notify if delivery fails

## 🎮 Bot Commands & Usage

### Profile Setup Flow
1. **Initial Contact**: User sends `/start`
2. **Age Input**: Text input with validation
3. **Gender Selection**: Inline keyboard with 3 options
4. **Education Level**: Inline keyboard with 5 options
5. **Language**: Inline keyboard with 11+ options
6. **Interests**: Multi-select with up to 10 interests
7. **Gender Preference**: Final selection for matching

### Matching Process
1. **Find Request**: User sends `/find`
2. **Queue Check**: Look for compatible users in queue
3. **Scoring**: Calculate compatibility with all candidates
4. **Best Match**: Select highest scoring compatible user
5. **Chat Start**: Notify both users and enable message forwarding

### Chat Management
- **Active Forwarding**: All media types supported
- **Quick Actions**: Inline buttons for Next/Stop/Report
- **Partner Notifications**: Inform when partner leaves
- **Clean Disconnection**: Proper session cleanup

## 🛡️ Safety & Moderation

### Content Filtering
- **Bad Words Filter**: Automatic detection and blocking
- **Media Support**: All Telegram media types allowed
- **Real-time Processing**: Instant filtering before forwarding

### Reporting System
- **User Reports**: `/report` command with reason
- **Admin Notifications**: Sent to designated admin chat
- **Report Details**: User IDs, timestamps, and context
- **Automatic Chat End**: Optional safety disconnection

### Admin Features
- **Centralized Reports**: All reports in one admin channel
- **User Information**: Reporter and reported user details
- **Moderation Tools**: Ban system for problematic users
- **Audit Trail**: Complete logging of all incidents

## 🚀 Deployment

### Development
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Run in development mode
npm run dev
```

### Production Deployment

#### Option 1: VPS/Cloud Server
```bash
# Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <your-repo>
cd telegram-anonymous-chat-bot
npm install --production

# Set up environment
nano .env
# Add your production values

# Run with PM2 (recommended)
npm install -g pm2
pm2 start index.js --name "chat-bot"
pm2 startup
pm2 save
```

#### Option 2: Heroku
```bash
# Install Heroku CLI
# Create Heroku app
heroku create your-bot-name

# Set environment variables
heroku config:set BOT_TOKEN=your_token
heroku config:set MONGO_URI=your_mongo_uri
heroku config:set ADMIN_CHAT_ID=your_admin_id

# Deploy
git push heroku main
```

#### Option 3: Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

### Environment Setup

#### MongoDB Atlas Setup
1. Create cluster at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create database user
3. Whitelist IP addresses (0.0.0.0/0 for cloud deployment)
4. Get connection string
5. Replace placeholders with actual values

#### Redis Setup (Alternative)
1. **Local**: Install and run Redis server
2. **Cloud**: Use Upstash, Redis Cloud, or AWS ElastiCache
3. **Connection**: Ensure proper URL format with auth

## 🔧 Customization

### Adding New Interests
```javascript
const INTERESTS = [
    '💻 Technology', '🎵 Music', '✈️ Travel',
    // Add your custom interests here
    '🎯 Your Interest', '🌟 Another Interest'
];
```

### Modifying Matching Scores
```javascript
// In MatchingService.calculateCompatibilityScore()
score += sharedInterests.length * 5; // Change multiplier
if (ageDiff <= 5) score += 3;        // Adjust age bonus
if (sameLanguage) score += 2;        // Modify language bonus
```

### Custom Content Filtering
```javascript
// Add custom word filters
const customFilter = new Filter();
customFilter.addWords('word1', 'word2', 'phrase');

// Custom filtering logic
if (customFilter.isProfane(message)) {
    // Handle inappropriate content
}
```

## 📊 Monitoring & Analytics

### Bot Performance
- **User Registrations**: Track new profile creations
- **Match Success Rate**: Monitor successful connections
- **Chat Duration**: Measure average conversation length
- **Popular Interests**: Analyze most selected interests

### Database Monitoring
- **Connection Health**: Monitor database connectivity
- **Query Performance**: Track response times
- **Storage Usage**: Monitor data growth

### Error Tracking
- **Bot Errors**: Catch and log all exceptions
- **Message Delivery**: Track failed forwards
- **Database Errors**: Monitor connection issues

## 🔍 Troubleshooting

### Common Issues

#### Bot Not Responding
```bash
# Check bot token
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"

# Verify environment variables
echo $BOT_TOKEN

# Check logs
npm start # Look for error messages
```

#### Database Connection Issues
```bash
# Test MongoDB connection
mongosh "your_connection_string"

# Test Redis connection
redis-cli -u "your_redis_url" ping
```

#### Message Forwarding Problems
- **Check Active Matches**: Verify users are properly matched
- **Validate User IDs**: Ensure partner IDs are correct
- **Test Bot Permissions**: Confirm bot can send messages

### Debug Mode
```javascript
// Enable debug logging
process.env.DEBUG = 'telegraf:*';

// Add custom logging
console.log('Debug info:', { userId, matchId, message });
```

### Performance Optimization
- **Database Indexing**: Ensure proper indexes on user lookups
- **Connection Pooling**: Use connection pooling for databases
- **Error Handling**: Implement proper error recovery
- **Rate Limiting**: Add rate limiting for API calls

## 🛠️ Advanced Features

### Planned Enhancements
- [ ] **Video Chat Integration**: WebRTC support
- [ ] **Group Chat Matching**: Multi-user conversations
- [ ] **Location-based Matching**: Geographic proximity
- [ ] **Interest Recommendations**: AI-powered suggestions
- [ ] **Chat Analytics**: Conversation insights
- [ ] **Advanced Moderation**: ML-based content filtering
- [ ] **Multi-language Support**: Internationalization
- [ ] **Mobile App**: Native iOS/Android clients

### API Extensions
- **Webhook Support**: For external integrations
- **REST API**: For web dashboard
- **Analytics API**: For monitoring tools
- **Admin API**: For moderation interfaces

## 📜 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: This README
- **Community**: [Telegram Group](https://t.me/your_support_group)

---

**Built with ❤️ using Node.js, Telegraf, and MongoDB**

*Connecting strangers safely and anonymously worldwide* 🌍
