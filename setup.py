#!/usr/bin/env python3
"""
Telegram Chat Bot Setup Script
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    print("Installing required packages...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ All packages installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing packages: {e}")
        return False
    return True

def setup_env_file():
    """Setup environment file"""
    env_path = ".env"
    if os.path.exists(env_path):
        print("⚠️  .env file already exists")
        return True
    
    print("\n📝 Setting up environment file...")
    print("You need to get a bot token from @BotFather on Telegram")
    print("1. Message @BotFather on Telegram")
    print("2. Use /newbot command")
    print("3. Follow instructions to create your bot")
    print("4. Copy the bot token")
    
    token = input("\nEnter your bot token: ").strip()
    
    if not token:
        print("❌ Bot token is required!")
        return False
    
    with open(env_path, 'w') as f:
        f.write(f"TELEGRAM_BOT_TOKEN={token}\n")
        f.write("DATABASE_URL=chat_bot.db\n")
    
    print("✅ Environment file created!")
    return True

def test_setup():
    """Test if setup is working"""
    print("\n🧪 Testing setup...")
    try:
        from database import Database
        db = Database()
        print("✅ Database connection successful!")
        
        # Test if telegram library is available
        import telegram
        print("✅ Telegram library imported successfully!")
        
        return True
    except Exception as e:
        print(f"❌ Setup test failed: {e}")
        return False

def main():
    print("🤖 Telegram Chat Bot Setup")
    print("=" * 30)
    
    # Install requirements
    if not install_requirements():
        return
    
    # Setup environment
    if not setup_env_file():
        return
    
    # Test setup
    if not test_setup():
        return
    
    print("\n🎉 Setup complete!")
    print("\nNext steps:")
    print("1. Make sure your bot token is correct in .env file")
    print("2. Run: python main.py")
    print("3. Start chatting with your bot on Telegram!")
    print("\nBot commands:")
    print("- /start - Register and create profile")
    print("- /find - Find someone to chat with")
    print("- /help - Show help")

if __name__ == "__main__":
    main()
