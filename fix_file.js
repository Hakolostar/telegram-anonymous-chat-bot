const fs = require('fs');

// Read the file
const content = fs.readFileSync('index.js', 'utf8');
const lines = content.split('\n');

// Keep only the first part (up to line 890)
const cleanContent = lines.slice(0, 890).join('\n');

// Add the proper ending
const properEnding = `

// Create stage and register scene
const stage = new Scenes.Stage([profileSetupScene]);
bot.use(session());
bot.use(stage.middleware());

// Commands
bot.start(async (ctx) => {
    const existingUser = await DatabaseOperations.getUser(ctx.from.id);
    if (existingUser) {
        await ctx.reply(
            '🎉 **Welcome back!**\\n\\n' +
            '👋 Ready to meet someone new?\\n\\n' +
            '🔸 /find - Find a new chat partner\\n' +
            '🔸 /profile - View or edit your profile\\n' +
            '🔸 /help - See all commands',
            { 
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔍 Find Match', 'find_match')],
                    [Markup.button.callback('👤 View Profile', 'view_profile')]
                ])
            }
        );
    } else {
        await ctx.reply(
            '🎭 **Welcome to Anonymous Chat!**\\n\\n' +
            '💕 Meet new people based on your interests and preferences\\n' +
            '🔒 Your conversations are completely anonymous\\n' +
            '🎯 Our smart matching finds compatible people\\n\\n' +
            '✨ Let\\'s create your profile to get started!',
            { 
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🚀 Create Profile', 'create_profile')]
                ])
            }
        );
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    if (ctx) {
        ctx.reply('❌ An unexpected error occurred. Please try again.').catch(console.error);
    }
});

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('🛑 Received SIGINT. Graceful shutdown...');
    if (redisClient) {
        redisClient.disconnect();
    }
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log('🛑 Received SIGTERM. Graceful shutdown...');
    if (redisClient) {
        redisClient.disconnect();
    }
    process.exit(0);
});

// Start the bot
async function startBot() {
    try {
        console.log('🚀 Starting Telegram Anonymous Chat Bot...');
        await initDatabase();
        await bot.launch();
        console.log('✅ Bot started successfully!');
        console.log('🎭 Anonymous Chat Bot is now running...');
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

startBot();
`;

// Write the clean file
fs.writeFileSync('index_clean.js', cleanContent + properEnding);
console.log('Clean file created as index_clean.js');
