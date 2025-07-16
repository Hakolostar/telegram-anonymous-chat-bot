# Telegram Chat Bot Configuration

# Bot Settings
BOT_NAME = "ChatMate"
BOT_VERSION = "1.0.0"

# Database Settings
DATABASE_PATH = "chat_bot.db"

# Matching Settings
MAX_SEARCH_RESULTS = 10
MIN_SHARED_INTERESTS = 1
DEFAULT_MIN_AGE = 18
DEFAULT_MAX_AGE = 100

# Chat Settings
MAX_MESSAGE_LENGTH = 4096
CHAT_TIMEOUT_HOURS = 24

# Interest Categories
INTEREST_CATEGORIES = [
    "Technology",
    "Entertainment", 
    "Culture",
    "Activities",
    "Lifestyle",
    "Hobbies",
    "Health",
    "Education",
    "Environment"
]

# Default Interests
DEFAULT_INTERESTS = [
    ("Technology", "Tech"),
    ("Music", "Entertainment"),
    ("Movies", "Entertainment"),
    ("Books", "Culture"),
    ("Sports", "Activities"),
    ("Travel", "Lifestyle"),
    ("Cooking", "Lifestyle"),
    ("Gaming", "Entertainment"),
    ("Art", "Culture"),
    ("Photography", "Hobbies"),
    ("Fitness", "Health"),
    ("Dancing", "Activities"),
    ("Science", "Education"),
    ("Programming", "Tech"),
    ("Fashion", "Lifestyle"),
    ("Anime", "Entertainment"),
    ("Pets", "Lifestyle"),
    ("Nature", "Environment"),
    ("History", "Education"),
    ("Languages", "Education")
]

# UI Messages
WELCOME_MESSAGE = """
🎉 Welcome to ChatMate!

I help you connect with interesting people for anonymous chats based on your interests and preferences.

Let's set up your profile to find the best chat partners for you!
"""

HELP_MESSAGE = """
🤖 **ChatMate Bot Help**

I help you find interesting people to chat with based on your interests and preferences!

**Commands:**
🔍 `/find` - Find someone to chat with
⏹️ `/stop` - End current chat
👤 `/profile` - View and edit your profile
🎯 `/interests` - Manage your interests
⚙️ `/settings` - Configure chat preferences
❓ `/help` - Show this help message

**How it works:**
1. Complete your profile with age, interests, and preferences
2. Use `/find` to get matched with someone compatible
3. Start chatting anonymously!
4. Use `/stop` when you want to end the chat

**Matching factors:**
• Shared interests
• Age preferences
• Gender preferences
• Location (city)
• Activity status

Have fun chatting! 💬
"""
