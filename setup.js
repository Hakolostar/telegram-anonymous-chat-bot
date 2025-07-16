#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🤖 Telegram Anonymous Chat Bot Setup');
console.log('=====================================\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].slice(1));

if (majorVersion < 16) {
    console.error('❌ Node.js 16 or higher is required');
    console.log(`   Current version: ${nodeVersion}`);
    console.log('   Please upgrade Node.js: https://nodejs.org/');
    process.exit(1);
}

console.log(`✅ Node.js ${nodeVersion} - Compatible\n`);

// Check if package.json exists
if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found');
    console.log('   Please run this script from the project root directory');
    process.exit(1);
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully\n');
} catch (error) {
    console.error('❌ Failed to install dependencies');
    console.error(error.message);
    process.exit(1);
}

// Check if .env file exists
if (!fs.existsSync('.env')) {
    console.log('📝 Creating .env file...');
    
    if (fs.existsSync('.env.example')) {
        fs.copyFileSync('.env.example', '.env');
        console.log('✅ .env file created from template\n');
    } else {
        const envContent = `# Environment Variables for Anonymous Chat Bot
BOT_TOKEN=your_telegram_bot_token_here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/anonymous_chat_bot
REDIS_URL=redis://localhost:6379
ADMIN_CHAT_ID=your_admin_chat_id_here
`;
        fs.writeFileSync('.env', envContent);
        console.log('✅ .env file created with defaults\n');
    }
} else {
    console.log('⚠️  .env file already exists\n');
}

// Read .env file and check configuration
const envContent = fs.readFileSync('.env', 'utf-8');
const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
const config = {};

envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        config[key] = value;
    }
});

console.log('🔧 Configuration Check:');
console.log('=======================');

// Check BOT_TOKEN
if (!config.BOT_TOKEN || config.BOT_TOKEN === 'your_telegram_bot_token_here') {
    console.log('❌ BOT_TOKEN: Not configured');
    console.log('   1. Message @BotFather on Telegram');
    console.log('   2. Send /newbot command');
    console.log('   3. Follow instructions to create your bot');
    console.log('   4. Copy the token to .env file\n');
} else {
    console.log('✅ BOT_TOKEN: Configured\n');
}

// Check database configuration
const hasDatabase = (config.MONGO_URI && config.MONGO_URI !== 'mongodb+srv://username:password@cluster.mongodb.net/anonymous_chat_bot') ||
                   (config.REDIS_URL && config.REDIS_URL !== 'redis://localhost:6379');

if (!hasDatabase) {
    console.log('⚠️  DATABASE: Using in-memory storage');
    console.log('   For production, configure either:');
    console.log('   • MONGO_URI for MongoDB Atlas');
    console.log('   • REDIS_URL for Redis instance\n');
} else {
    if (config.MONGO_URI && config.MONGO_URI !== 'mongodb+srv://username:password@cluster.mongodb.net/anonymous_chat_bot') {
        console.log('✅ MongoDB: Configured');
    }
    if (config.REDIS_URL && config.REDIS_URL !== 'redis://localhost:6379') {
        console.log('✅ Redis: Configured');
    }
    console.log();
}

// Check admin configuration
if (!config.ADMIN_CHAT_ID || config.ADMIN_CHAT_ID === 'your_admin_chat_id_here') {
    console.log('⚠️  ADMIN_CHAT_ID: Not configured');
    console.log('   Reports will not be sent to admin');
    console.log('   To configure: Get your chat ID from @userinfobot\n');
} else {
    console.log('✅ ADMIN_CHAT_ID: Configured\n');
}

// Test basic imports
console.log('🧪 Testing Dependencies:');
console.log('========================');

try {
    require('telegraf');
    console.log('✅ Telegraf: Available');
} catch (error) {
    console.log('❌ Telegraf: Missing');
}

try {
    require('mongodb');
    console.log('✅ MongoDB: Available');
} catch (error) {
    console.log('❌ MongoDB: Missing');
}

try {
    require('redis');
    console.log('✅ Redis: Available');
} catch (error) {
    console.log('❌ Redis: Missing');
}

try {
    require('bad-words');
    console.log('✅ Bad-words: Available');
} catch (error) {
    console.log('❌ Bad-words: Missing');
}

console.log('\n🚀 Setup Summary:');
console.log('==================');

if (config.BOT_TOKEN && config.BOT_TOKEN !== 'your_telegram_bot_token_here') {
    console.log('✅ Ready to start! Run: npm start');
    console.log('   For development: npm run dev');
    
    // Offer to start the bot
    if (process.argv.includes('--start')) {
        console.log('\n🎯 Starting bot...\n');
        try {
            execSync('npm start', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ Failed to start bot');
            process.exit(1);
        }
    }
} else {
    console.log('⚠️  Configuration required:');
    console.log('   1. Edit .env file with your bot token');
    console.log('   2. Optionally configure database (MongoDB/Redis)');
    console.log('   3. Run: npm start');
}

console.log('\n📚 Useful Commands:');
console.log('===================');
console.log('npm start          - Start the bot');
console.log('npm run dev        - Development mode with auto-reload');
console.log('node setup.js      - Run this setup again');
console.log('node setup.js --start - Setup and start bot');

console.log('\n🔗 Helpful Links:');
console.log('==================');
console.log('Bot Creation: https://t.me/botfather');
console.log('MongoDB Atlas: https://cloud.mongodb.com/');
console.log('Redis Cloud: https://redis.com/');
console.log('Documentation: README.md');

console.log('\n🎉 Setup completed successfully!');
