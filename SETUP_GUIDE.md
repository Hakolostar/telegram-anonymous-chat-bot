# 🤖 Telegram ChatMate Bot

## Quick Start Guide

### 1. Get Your Bot Token
1. Open Telegram and message [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Choose a name for your bot (e.g., "ChatMate Helper")
4. Choose a username (must end with 'bot', e.g., "chatmate_helper_bot")
5. Copy the bot token you receive

### 2. Setup the Bot

#### Option A: Automatic Setup (Recommended)
```bash
# Run the setup script
run_setup.bat
```

#### Option B: Manual Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Create .env file and add your token
echo TELEGRAM_BOT_TOKEN=your_bot_token_here > .env

# Test the setup
python test_bot.py

# Start the bot
python main.py
```

### 3. Use Your Bot
1. Start a chat with your bot on Telegram
2. Send `/start` to create your profile
3. Follow the setup wizard
4. Use `/find` to start chatting with strangers!

## 🌟 Features

### User Profiles
- Age, gender, and location
- Personal bio and interests
- Matching preferences (age range, gender preference)
- Interest-based matching

### Smart Matching
- **Interest Compatibility**: Users with shared interests get higher match scores
- **Age Preferences**: Respects both users' age range preferences
- **Gender Preferences**: Matches based on what each user is looking for
- **Location**: Prioritizes users from the same city
- **Activity Status**: Only matches active, available users

### Anonymous Chat
- Completely anonymous conversations
- No personal information shared
- Safe environment for meeting new people
- Easy to end conversations with `/stop`

### Interest Management
- 20+ predefined interests across multiple categories
- Easy interest selection with inline keyboards
- Interest-based matching algorithm

## 📋 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Register and create your profile |
| `/find` | Find a chat partner |
| `/stop` | End current chat |
| `/profile` | View and edit your profile |
| `/interests` | Manage your interests |
| `/settings` | Configure matching preferences |
| `/help` | Show help message |

## 🗄️ Database Schema

### Users Table
- `user_id` - Telegram user ID (primary key)
- `username` - Telegram username
- `first_name` - User's first name
- `age` - User's age
- `gender` - User's gender (male/female/other)
- `city` - User's city
- `bio` - User's bio/description
- `looking_for` - Gender preference (male/female/anyone)
- `min_age`, `max_age` - Age range preferences
- `is_active` - Whether user is active
- `is_in_chat` - Whether user is currently in a chat

### Interests System
- `interests` - Available interests with categories
- `user_interests` - User-interest relationships
- Interest categories: Technology, Entertainment, Culture, Activities, etc.

### Chat System
- `chat_sessions` - Active and completed chat sessions
- `chat_messages` - Message history for analytics
- Session management with proper cleanup

## 🔧 Configuration

### Environment Variables (.env)
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
DATABASE_URL=chat_bot.db
```

### Matching Algorithm Settings
- Shared interests: +10 points each
- Age compatibility: +20 points (max, decreases with age difference)
- City match: +15 points
- Gender preference match: +25 points
- Bio completion: +5 points
- Recent activity: +5 points

## 🛠️ Development

### Project Structure
```
Were/
├── main.py              # Main bot application
├── database.py          # Database operations
├── services.py          # Business logic services
├── config.py           # Configuration settings
├── requirements.txt    # Python dependencies
├── test_bot.py        # Test suite
├── setup.py           # Setup script
├── run_setup.bat      # Windows setup script
├── .env               # Environment variables
├── .env.example       # Environment template
├── .gitignore         # Git ignore file
└── README.md          # This file
```

### Key Components

#### Database Layer (`database.py`)
- SQLite database with proper schema
- User management operations
- Interest management
- Chat session tracking
- Message logging

#### Services Layer (`services.py`)
- `MatchingService`: Smart user matching algorithm
- `ProfileService`: Profile creation and management wizard
- `ChatService`: Chat session management

#### Bot Layer (`main.py`)
- Telegram bot handlers
- Command processing
- Message forwarding
- UI management with inline keyboards

### Adding New Features

#### Adding New Interests
1. Add to `DEFAULT_INTERESTS` in `config.py`
2. Or add directly to database via admin interface

#### Modifying Matching Algorithm
1. Edit `_calculate_match_score()` in `services.py`
2. Adjust scoring weights as needed

#### Adding New Commands
1. Create handler function in `main.py`
2. Add to `_setup_handlers()`
3. Update help text

## 🔒 Privacy & Safety

- **Anonymous Chats**: No personal information is shared between users
- **Easy Exit**: Users can end chats anytime with `/stop`
- **No Message Storage**: Messages are only logged for basic analytics
- **Safe Matching**: Users control their preferences and age ranges
- **Report System**: Can be extended with user reporting features

## 🚀 Deployment

### Local Development
```bash
python main.py
```

### Production Deployment
1. Use a process manager like `pm2` or `systemd`
2. Set up proper logging
3. Use PostgreSQL instead of SQLite for better performance
4. Add monitoring and health checks

### Scaling Considerations
- Database optimization for large user bases
- Message queue for handling high chat volumes
- Load balancing for multiple bot instances
- Redis for session management

## 🐛 Troubleshooting

### Common Issues

**Bot not responding:**
- Check bot token is correct
- Verify internet connection
- Check Telegram API status

**Import errors:**
- Run `pip install -r requirements.txt`
- Check Python version (3.7+)

**Database errors:**
- Check file permissions
- Verify SQLite installation

**Matching not working:**
- Check user profiles are complete
- Verify users have interests set
- Check age and gender preferences

### Getting Help

1. Check this README for common issues
2. Run `python test_bot.py` to verify setup
3. Check the logs for error messages
4. Ensure all dependencies are installed

## 📈 Analytics & Metrics

The bot tracks:
- User registrations and profile completion rates
- Successful matches and chat durations
- Popular interests and matching patterns
- User activity and retention

## 🎯 Future Enhancements

- **Photo sharing** in chats
- **Voice message** support
- **Group chat** matching
- **Video call** integration
- **Advanced filtering** (hobbies, education, etc.)
- **Reputation system** with user ratings
- **Geographic matching** with distance preferences
- **Language preferences** and multi-language support
- **Admin panel** for bot management
- **Analytics dashboard** for usage insights

---

Made with ❤️ for connecting people around the world!
