from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
import logging
import os
from typing import Dict, List
from dotenv import load_dotenv
from database import Database
from services import MatchingService, ProfileService, ChatService

# Load environment variables
load_dotenv()

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class TelegramChatBot:
    def __init__(self, token: str):
        self.token = token
        self.db = Database()
        self.matching_service = MatchingService(self.db)
        self.profile_service = ProfileService(self.db)
        self.chat_service = ChatService(self.db)
        
        # User state tracking
        self.user_states: Dict[int, str] = {}
        
        # Build application
        self.application = Application.builder().token(token).build()
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Setup command and message handlers"""
        # Command handlers
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("profile", self.profile_command))
        self.application.add_handler(CommandHandler("find", self.find_command))
        self.application.add_handler(CommandHandler("stop", self.stop_command))
        self.application.add_handler(CommandHandler("interests", self.interests_command))
        self.application.add_handler(CommandHandler("settings", self.settings_command))
        
        # Callback query handler for inline keyboards
        self.application.add_handler(CallbackQueryHandler(self.button_callback))
        
        # Message handler for regular messages
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        user = update.effective_user
        user_id = user.id
        
        # Register user in database
        self.db.create_or_update_user(
            user_id=user_id,
            username=user.username,
            first_name=user.first_name
        )
        
        # Check if profile is complete
        profile_status = self.profile_service.get_profile_completion_status(user_id)
        
        if profile_status['completed']:
            await update.message.reply_text(
                f"Welcome back, {user.first_name}! 👋\n\n"
                "Your profile is complete. Use /find to start chatting with someone new!\n\n"
                "Commands:\n"
                "🔍 /find - Find a chat partner\n"
                "👤 /profile - View your profile\n"
                "🎯 /interests - Manage interests\n"
                "⚙️ /settings - Chat preferences\n"
                "❓ /help - Show help"
            )
        else:
            await update.message.reply_text(
                f"Welcome to ChatMate! 🎉\n\n"
                f"Hi {user.first_name}! I'll help you connect with interesting people for anonymous chats.\n\n"
                "Let's set up your profile first. This helps me find the best chat partners for you!\n\n"
                "Ready to start? 🚀"
            )
            
            # Start profile setup
            self.user_states[user_id] = 'setup_age'
            step_info = self.profile_service.create_profile_wizard_step(user_id, 'age')
            await update.message.reply_text(step_info['question'])
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        help_text = """
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
        await update.message.reply_text(help_text)
    
    async def profile_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /profile command"""
        user_id = update.effective_user.id
        user_data = self.db.get_user(user_id)
        
        if not user_data:
            await update.message.reply_text("Please use /start first to create your profile.")
            return
        
        interests = self.db.get_user_interests(user_id)
        interests_text = ", ".join([i['name'] for i in interests]) if interests else "None"
        
        profile_text = f"""
👤 **Your Profile**

**Basic Info:**
• Age: {user_data.get('age', 'Not set')}
• Gender: {user_data.get('gender', 'Not set').title()}
• City: {user_data.get('city', 'Not set')}

**Preferences:**
• Looking for: {user_data.get('looking_for', 'Not set').title()}
• Age range: {user_data.get('min_age', 18)}-{user_data.get('max_age', 100)}

**About:**
{user_data.get('bio', 'No bio set')}

**Interests:**
{interests_text}

**Status:** {'🟢 Active' if user_data.get('is_active') else '🔴 Inactive'}
{'💬 In chat' if user_data.get('is_in_chat') else '💤 Available'}
        """
        
        # Create inline keyboard for profile editing
        keyboard = [
            [InlineKeyboardButton("✏️ Edit Profile", callback_data="edit_profile")],
            [InlineKeyboardButton("🎯 Manage Interests", callback_data="manage_interests")],
            [InlineKeyboardButton("⚙️ Settings", callback_data="settings")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(profile_text, reply_markup=reply_markup)
    
    async def find_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /find command"""
        user_id = update.effective_user.id
        
        # Check if profile is complete
        profile_status = self.profile_service.get_profile_completion_status(user_id)
        if not profile_status['completed']:
            await update.message.reply_text(
                "Please complete your profile first!\n"
                f"Missing: {', '.join(profile_status['missing_fields'])}\n\n"
                "Use /start to set up your profile."
            )
            return
        
        # Check if already in chat
        active_session = self.db.get_active_chat_session(user_id)
        if active_session:
            await update.message.reply_text(
                "You're already in a chat! 💬\n"
                "Use /stop to end the current chat before finding a new partner."
            )
            return
        
        await update.message.reply_text("🔍 Looking for someone interesting to chat with...")
        
        # Find a match
        match = self.matching_service.find_match(user_id)
        
        if match:
            # Create chat session
            session_id = self.chat_service.start_chat(user_id, match['user_id'])
            
            # Get match interests for display
            match_interests = self.db.get_user_interests(match['user_id'])
            interests_text = ", ".join([i['name'] for i in match_interests[:5]])
            if len(match_interests) > 5:
                interests_text += f" +{len(match_interests) - 5} more"
            
            # Notify both users
            match_info = f"""
🎉 **Match Found!**

You've been connected with someone who shares your interests!

**About your chat partner:**
• Age: {match['age']}
• From: {match['city']}
• Interests: {interests_text or 'Similar to yours'}

Say hello! The chat is completely anonymous. 💬

Use /stop to end the chat anytime.
            """
            
            await update.message.reply_text(match_info)
            
            # Notify the matched user
            try:
                user_interests = self.db.get_user_interests(user_id)
                user_interests_text = ", ".join([i['name'] for i in user_interests[:5]])
                if len(user_interests) > 5:
                    user_interests_text += f" +{len(user_interests) - 5} more"
                
                user_data = self.db.get_user(user_id)
                if user_data:
                    partner_info = f"""
🎉 **Match Found!**

You've been connected with someone who shares your interests!

**About your chat partner:**
• Age: {user_data['age']}
• From: {user_data['city']}
• Interests: {user_interests_text or 'Similar to yours'}

Say hello! The chat is completely anonymous. 💬

Use /stop to end the chat anytime.
                    """
                    
                    await context.bot.send_message(chat_id=match['user_id'], text=partner_info)
            except Exception as e:
                logger.error(f"Failed to notify matched user: {e}")
        
        else:
            await update.message.reply_text(
                "😔 No matches found right now.\n\n"
                "This could be because:\n"
                "• No one with similar preferences is online\n"
                "• Everyone is already in chats\n"
                "• Your preferences are very specific\n\n"
                "Try again in a few minutes, or update your preferences in /settings!"
            )
    
    async def stop_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /stop command"""
        user_id = update.effective_user.id
        
        active_session = self.db.get_active_chat_session(user_id)
        if not active_session:
            await update.message.reply_text("You're not currently in a chat.")
            return
        
        # Get partner ID
        partner_id = self.chat_service.get_chat_partner(active_session['id'], user_id)
        
        # End the chat
        self.chat_service.end_chat(active_session['id'])
        
        await update.message.reply_text(
            "Chat ended! 👋\n\n"
            "Thanks for using ChatMate. Use /find to start a new chat!"
        )
        
        # Notify partner
        if partner_id:
            try:
                await context.bot.send_message(
                    chat_id=partner_id,
                    text="Your chat partner has left the conversation. 👋\n\n"
                         "Use /find to start a new chat!"
                )
            except Exception as e:
                logger.error(f"Failed to notify partner about chat end: {e}")
    
    async def interests_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /interests command"""
        user_id = update.effective_user.id
        
        # Get all interests grouped by category
        all_interests = self.db.get_interests()
        user_interests = self.db.get_user_interests(user_id)
        user_interest_ids = {i['id'] for i in user_interests}
        
        # Group interests by category
        categories = {}
        for interest in all_interests:
            category = interest['category']
            if category not in categories:
                categories[category] = []
            categories[category].append(interest)
        
        # Create inline keyboard
        keyboard = []
        for category, interests in categories.items():
            # Add category header
            keyboard.append([InlineKeyboardButton(f"📁 {category}", callback_data="category_header")])
            
            # Add interests in rows of 2
            for i in range(0, len(interests), 2):
                row = []
                for j in range(i, min(i + 2, len(interests))):
                    interest = interests[j]
                    selected = "✅" if interest['id'] in user_interest_ids else "⬜"
                    row.append(InlineKeyboardButton(
                        f"{selected} {interest['name']}", 
                        callback_data=f"toggle_interest_{interest['id']}"
                    ))
                keyboard.append(row)
        
        keyboard.append([InlineKeyboardButton("✅ Done", callback_data="interests_done")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        current_interests = ", ".join([i['name'] for i in user_interests]) if user_interests else "None"
        
        await update.message.reply_text(
            f"🎯 **Manage Your Interests**\n\n"
            f"Current interests: {current_interests}\n\n"
            f"Select/deselect interests below:",
            reply_markup=reply_markup
        )
    
    async def settings_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /settings command"""
        user_id = update.effective_user.id
        user_data = self.db.get_user(user_id)
        
        if not user_data:
            await update.message.reply_text("Please use /start first.")
            return
        
        keyboard = [
            [InlineKeyboardButton("🎂 Age Range", callback_data="settings_age_range")],
            [InlineKeyboardButton("💕 Looking For", callback_data="settings_looking_for")],
            [InlineKeyboardButton("🏙️ City", callback_data="settings_city")],
            [InlineKeyboardButton("📝 Bio", callback_data="settings_bio")],
            [InlineKeyboardButton("🔄 Reset Profile", callback_data="settings_reset")]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        settings_text = f"""
⚙️ **Settings**

**Current Preferences:**
• Age range: {user_data.get('min_age', 18)}-{user_data.get('max_age', 100)}
• Looking for: {user_data.get('looking_for', 'anyone').title()}
• City: {user_data.get('city', 'Not set')}

**Profile:**
• Bio: {user_data.get('bio', 'Not set')[:50]}{'...' if len(user_data.get('bio', '')) > 50 else ''}

Select what you'd like to change:
        """
        
        await update.message.reply_text(settings_text, reply_markup=reply_markup)
    
    async def button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle inline keyboard button presses"""
        query = update.callback_query
        await query.answer()
        
        user_id = query.from_user.id
        data = query.data
        
        if data.startswith("toggle_interest_"):
            interest_id = int(data.split("_")[2])
            user_interests = self.db.get_user_interests(user_id)
            user_interest_ids = {i['id'] for i in user_interests}
            
            if interest_id in user_interest_ids:
                self.db.remove_user_interest(user_id, interest_id)
            else:
                self.db.add_user_interest(user_id, interest_id)
            
            # Refresh the interests keyboard
            await self.interests_command(query, context)
        
        elif data == "interests_done":
            user_interests = self.db.get_user_interests(user_id)
            interests_text = ", ".join([i['name'] for i in user_interests])
            
            await query.edit_message_text(
                f"✅ Interests updated!\n\n"
                f"Your interests: {interests_text}\n\n"
                f"Use /find to start chatting with people who share your interests!"
            )
        
        elif data == "edit_profile":
            await query.edit_message_text(
                "Profile editing coming soon! For now, use /settings to change specific fields."
            )
        
        elif data == "manage_interests":
            await self.interests_command(query, context)
        
        elif data == "settings":
            await self.settings_command(query, context)
        
        # Handle other callback data...
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle regular text messages"""
        user_id = update.effective_user.id
        message_text = update.message.text
        
        # Check if user is in profile setup
        if user_id in self.user_states:
            await self._handle_profile_setup(update, context)
            return
        
        # Check if user is in an active chat
        active_session = self.db.get_active_chat_session(user_id)
        if active_session:
            await self._handle_chat_message(update, context, active_session)
            return
        
        # Default response for users not in setup or chat
        await update.message.reply_text(
            "Hi! Use /find to start chatting with someone, or /help for more commands."
        )
    
    async def _handle_profile_setup(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle profile setup messages"""
        user_id = update.effective_user.id
        message_text = update.message.text
        current_state = self.user_states.get(user_id)
        
        if current_state == 'setup_age':
            step_info = self.profile_service.create_profile_wizard_step(user_id, 'age')
            if step_info['validation'](message_text):
                if self.profile_service.validate_and_save_field(user_id, 'age', message_text):
                    self.user_states[user_id] = 'setup_gender'
                    next_step = self.profile_service.create_profile_wizard_step(user_id, 'gender')
                    await update.message.reply_text(f"Great! {next_step['question']}")
                else:
                    await update.message.reply_text("Please enter a valid age (13-100).")
            else:
                await update.message.reply_text("Please enter a valid age (13-100).")
        
        elif current_state == 'setup_gender':
            if self.profile_service.validate_and_save_field(user_id, 'gender', message_text):
                self.user_states[user_id] = 'setup_looking_for'
                next_step = self.profile_service.create_profile_wizard_step(user_id, 'looking_for')
                await update.message.reply_text(f"Perfect! {next_step['question']}")
            else:
                await update.message.reply_text("Please choose: Male, Female, or Other")
        
        elif current_state == 'setup_looking_for':
            if self.profile_service.validate_and_save_field(user_id, 'looking_for', message_text):
                self.user_states[user_id] = 'setup_city'
                next_step = self.profile_service.create_profile_wizard_step(user_id, 'city')
                await update.message.reply_text(f"Awesome! {next_step['question']}")
            else:
                await update.message.reply_text("Please choose: Male, Female, or Anyone")
        
        elif current_state == 'setup_city':
            if self.profile_service.validate_and_save_field(user_id, 'city', message_text):
                self.user_states[user_id] = 'setup_bio'
                next_step = self.profile_service.create_profile_wizard_step(user_id, 'bio')
                await update.message.reply_text(f"Nice! {next_step['question']}")
            else:
                await update.message.reply_text("Please enter your city name.")
        
        elif current_state == 'setup_bio':
            if self.profile_service.validate_and_save_field(user_id, 'bio', message_text):
                del self.user_states[user_id]
                await update.message.reply_text(
                    "🎉 Profile setup complete!\n\n"
                    "Now let's add some interests so I can find great chat partners for you.\n\n"
                    "Use /interests to add your interests, then /find to start chatting!"
                )
            else:
                await update.message.reply_text("Please write a bio with at least 10 characters.")
    
    async def _handle_chat_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE, session):
        """Handle messages during active chat"""
        user_id = update.effective_user.id
        message_text = update.message.text
        
        # Save message to database
        self.chat_service.send_message(session['id'], user_id, message_text)
        
        # Forward to chat partner
        partner_id = self.chat_service.get_chat_partner(session['id'], user_id)
        if partner_id:
            try:
                await context.bot.send_message(
                    chat_id=partner_id,
                    text=f"💬 {message_text}"
                )
            except Exception as e:
                logger.error(f"Failed to forward message to partner: {e}")
                await update.message.reply_text(
                    "⚠️ Message couldn't be delivered. Your chat partner might have left."
                )
    
    def run(self):
        """Start the bot"""
        logger.info("Starting ChatMate bot...")
        self.application.run_polling()

def main():
    # Get bot token from environment variable
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not token:
        print("❌ TELEGRAM_BOT_TOKEN not found in environment variables")
        print("Please:")
        print("1. Create a .env file")
        print("2. Add: TELEGRAM_BOT_TOKEN=your_bot_token_here")
        print("3. Get your token from @BotFather on Telegram")
        return
    
    try:
        # Create and run bot
        bot = TelegramChatBot(token)
        bot.run()
    except Exception as e:
        logger.error(f"Failed to start bot: {e}")
        print(f"❌ Error starting bot: {e}")
        print("\nTroubleshooting:")
        print("1. Check your bot token is correct")
        print("2. Make sure you have internet connection")
        print("3. Verify all dependencies are installed: pip install -r requirements.txt")

if __name__ == '__main__':
    main()
