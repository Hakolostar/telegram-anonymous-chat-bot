const fs = require('fs');

// Read the file
const content = fs.readFileSync('index.js', 'utf8');
const lines = content.split('\n');

// Find where the duplication starts by looking for the second occurrence of "// Database operations"
let duplicateStart = -1;
let foundFirst = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// Database operations')) {
        if (foundFirst) {
            duplicateStart = i;
            break;
        } else {
            foundFirst = true;
        }
    }
}

console.log('Duplicate starts at line:', duplicateStart);

if (duplicateStart > 0) {
    // Keep only the first part (up to the duplicate)
    const cleanContent = lines.slice(0, duplicateStart).join('\n');
    
    // Add proper ending
    const ending = `
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

    // Write the fixed file
    fs.writeFileSync('index.js', cleanContent + ending);
    console.log('File fixed and proper ending added');
} else {
    console.log('No duplicate found');
}
