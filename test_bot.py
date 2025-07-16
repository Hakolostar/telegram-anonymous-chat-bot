#!/usr/bin/env python3
"""
Test script for the Telegram Chat Bot
"""

def test_database():
    """Test database functionality"""
    print("Testing database...")
    try:
        from database import Database
        db = Database()
        
        # Test user creation
        db.create_or_update_user(12345, "testuser", "Test User", age=25, gender="male", city="TestCity")
        user = db.get_user(12345)
        
        if user and user['age'] == 25:
            print("✅ Database test passed!")
            return True
        else:
            print("❌ Database test failed!")
            return False
    except Exception as e:
        print(f"❌ Database test error: {e}")
        return False

def test_services():
    """Test service functionality"""
    print("Testing services...")
    try:
        from database import Database
        from services import MatchingService, ProfileService, ChatService
        
        db = Database()
        matching_service = MatchingService(db)
        profile_service = ProfileService(db)
        chat_service = ChatService(db)
        
        # Test profile service
        status = profile_service.get_profile_completion_status(12345)
        if isinstance(status, dict):
            print("✅ Services test passed!")
            return True
        else:
            print("❌ Services test failed!")
            return False
    except Exception as e:
        print(f"❌ Services test error: {e}")
        return False

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing imports...")
    try:
        # Test if python-telegram-bot is available
        import telegram
        from telegram.ext import Application
        print("✅ Telegram library available!")
        
        # Test other imports
        import sqlite3
        import logging
        import os
        print("✅ All imports successful!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Run: pip install -r requirements.txt")
        return False

def main():
    print("🧪 Telegram Chat Bot Test Suite")
    print("=" * 40)
    
    all_passed = True
    
    # Test imports
    if not test_imports():
        all_passed = False
    
    print()
    
    # Test database
    if not test_database():
        all_passed = False
    
    print()
    
    # Test services  
    if not test_services():
        all_passed = False
    
    print()
    print("=" * 40)
    
    if all_passed:
        print("🎉 All tests passed! Bot is ready to run.")
        print("\nTo start the bot:")
        print("1. Make sure you have a bot token in .env file")
        print("2. Run: python main.py")
    else:
        print("❌ Some tests failed. Please check the errors above.")

if __name__ == "__main__":
    main()
