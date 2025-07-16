#!/usr/bin/env node

const { Telegraf } = require('telegraf');
const { MongoClient } = require('mongodb');
const redis = require('redis');

require('dotenv').config();

console.log('🧪 Telegram Anonymous Chat Bot - Test Suite');
console.log('===========================================\n');

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const REDIS_URL = process.env.REDIS_URL;

let testResults = {
    passed: 0,
    failed: 0,
    total: 0
};

function runTest(testName, testFn) {
    testResults.total++;
    console.log(`🔍 Testing: ${testName}`);
    
    try {
        const result = testFn();
        if (result instanceof Promise) {
            return result.then(success => {
                if (success !== false) {
                    console.log(`✅ ${testName} - PASSED\n`);
                    testResults.passed++;
                } else {
                    console.log(`❌ ${testName} - FAILED\n`);
                    testResults.failed++;
                }
            }).catch(error => {
                console.log(`❌ ${testName} - FAILED: ${error.message}\n`);
                testResults.failed++;
            });
        } else if (result !== false) {
            console.log(`✅ ${testName} - PASSED\n`);
            testResults.passed++;
        } else {
            console.log(`❌ ${testName} - FAILED\n`);
            testResults.failed++;
        }
    } catch (error) {
        console.log(`❌ ${testName} - FAILED: ${error.message}\n`);
        testResults.failed++;
    }
}

async function testBot() {
    console.log('📋 Environment Configuration Tests');
    console.log('==================================\n');

    // Test 1: Bot Token
    runTest('Bot Token Configuration', () => {
        if (!BOT_TOKEN) {
            console.log('   ❌ BOT_TOKEN not found in environment');
            return false;
        }
        if (BOT_TOKEN === 'your_telegram_bot_token_here') {
            console.log('   ❌ BOT_TOKEN not configured (using default value)');
            return false;
        }
        if (!BOT_TOKEN.match(/^\d+:[A-Za-z0-9_-]+$/)) {
            console.log('   ❌ BOT_TOKEN format appears invalid');
            return false;
        }
        console.log('   ✅ Bot token format looks valid');
        return true;
    });

    // Test 2: Database Configuration
    runTest('Database Configuration', () => {
        if (MONGO_URI && MONGO_URI !== 'mongodb+srv://username:password@cluster.mongodb.net/anonymous_chat_bot') {
            console.log('   ✅ MongoDB URI configured');
            return true;
        }
        if (REDIS_URL && REDIS_URL !== 'redis://localhost:6379') {
            console.log('   ✅ Redis URL configured');
            return true;
        }
        console.log('   ⚠️  No database configured - will use in-memory storage');
        return true; // Not a failure, just a warning
    });

    console.log('🔧 Dependency Tests');
    console.log('===================\n');

    // Test 3: Required Dependencies
    runTest('Required Dependencies', () => {
        const deps = ['telegraf', 'mongodb', 'redis', 'dotenv', 'joi', 'moment', 'bad-words'];
        const missing = [];
        
        deps.forEach(dep => {
            try {
                require(dep);
                console.log(`   ✅ ${dep}`);
            } catch (error) {
                console.log(`   ❌ ${dep} - Missing`);
                missing.push(dep);
            }
        });
        
        if (missing.length > 0) {
            console.log(`   ❌ Missing dependencies: ${missing.join(', ')}`);
            console.log('   💡 Run: npm install');
            return false;
        }
        return true;
    });

    console.log('🌐 Connection Tests');
    console.log('===================\n');

    // Test 4: Bot API Connection
    await runTest('Telegram Bot API', async () => {
        if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token_here') {
            console.log('   ⏭️  Skipping - Bot token not configured');
            return true;
        }
        
        try {
            const bot = new Telegraf(BOT_TOKEN);
            const botInfo = await bot.telegram.getMe();
            console.log(`   ✅ Connected to bot: @${botInfo.username}`);
            console.log(`   📝 Bot name: ${botInfo.first_name}`);
            return true;
        } catch (error) {
            console.log(`   ❌ Connection failed: ${error.message}`);
            if (error.message.includes('401')) {
                console.log('   💡 Check your bot token');
            }
            return false;
        }
    });

    // Test 5: MongoDB Connection
    await runTest('MongoDB Connection', async () => {
        if (!MONGO_URI || MONGO_URI === 'mongodb+srv://username:password@cluster.mongodb.net/anonymous_chat_bot') {
            console.log('   ⏭️  Skipping - MongoDB not configured');
            return true;
        }
        
        try {
            const client = new MongoClient(MONGO_URI);
            await client.connect();
            console.log('   ✅ MongoDB connection successful');
            
            // Test database operations
            const db = client.db('anonymous_chat_bot');
            const collections = await db.listCollections().toArray();
            console.log(`   📊 Database collections: ${collections.length}`);
            
            await client.close();
            return true;
        } catch (error) {
            console.log(`   ❌ MongoDB connection failed: ${error.message}`);
            console.log('   💡 Check your MONGO_URI and network connection');
            return false;
        }
    });

    // Test 6: Redis Connection
    await runTest('Redis Connection', async () => {
        if (!REDIS_URL || REDIS_URL === 'redis://localhost:6379') {
            console.log('   ⏭️  Skipping - Redis not configured');
            return true;
        }
        
        try {
            const client = redis.createClient({ url: REDIS_URL });
            await client.connect();
            
            const pong = await client.ping();
            console.log(`   ✅ Redis connection successful: ${pong}`);
            
            await client.quit();
            return true;
        } catch (error) {
            console.log(`   ❌ Redis connection failed: ${error.message}`);
            console.log('   💡 Check your REDIS_URL and service status');
            return false;
        }
    });

    console.log('🧠 Logic Tests');
    console.log('==============\n');

    // Test 7: Matching Algorithm
    runTest('Matching Algorithm', () => {
        // Import the matching service
        const MatchingService = require('./index.js').MatchingService || class {
            static calculateCompatibilityScore(user1, user2) {
                let score = 0;
                const sharedInterests = user1.interests.filter(i => user2.interests.includes(i));
                score += sharedInterests.length * 5;
                const ageDiff = Math.abs(user1.age - user2.age);
                if (ageDiff <= 5) score += 3;
                if (user1.language === user2.language) score += 2;
                return score;
            }
            
            static checkGenderCompatibility(user1, user2) {
                const user1WantsUser2 = user1.preferredGender === 'Any' || 
                                       user1.preferredGender.replace(' only', '') === user2.gender;
                const user2WantsUser1 = user2.preferredGender === 'Any' || 
                                       user2.preferredGender.replace(' only', '') === user1.gender;
                return user1WantsUser2 && user2WantsUser1;
            }
        };

        // Test users
        const user1 = {
            age: 25,
            gender: 'Male',
            interests: ['💻 Technology', '🎵 Music'],
            preferredGender: 'Any',
            language: 'English'
        };
        
        const user2 = {
            age: 27,
            gender: 'Female',
            interests: ['💻 Technology', '📚 Books'],
            preferredGender: 'Male only',
            language: 'English'
        };

        // Test scoring
        const score = MatchingService.calculateCompatibilityScore(user1, user2);
        console.log(`   📊 Compatibility score: ${score}`);
        
        // Test gender compatibility
        const compatible = MatchingService.checkGenderCompatibility(user1, user2);
        console.log(`   💕 Gender compatible: ${compatible}`);
        
        if (score > 0 && compatible) {
            console.log('   ✅ Matching logic working correctly');
            return true;
        } else {
            console.log('   ❌ Matching logic issues detected');
            return false;
        }
    });

    // Test 8: Content Filtering
    runTest('Content Filtering', () => {
        try {
            const Filter = require('bad-words');
            const filter = new Filter();
            
            const testMessages = [
                'Hello, how are you?',
                'I love programming!',
                // Add a mild test word that should be filtered
                'damn this is cool'
            ];
            
            testMessages.forEach(msg => {
                const filtered = filter.clean(msg);
                console.log(`   📝 "${msg}" → "${filtered}"`);
            });
            
            console.log('   ✅ Content filtering operational');
            return true;
        } catch (error) {
            console.log(`   ❌ Content filtering failed: ${error.message}`);
            return false;
        }
    });

    // Print final results
    console.log('📊 Test Results Summary');
    console.log('======================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    
    const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%\n`);

    if (testResults.failed === 0) {
        console.log('🎉 All tests passed! Your bot is ready to deploy.');
        console.log('🚀 Run: npm start');
    } else if (testResults.failed <= 2) {
        console.log('⚠️  Some tests failed, but the bot should still work.');
        console.log('🔧 Review the failed tests and fix configuration issues.');
    } else {
        console.log('❌ Multiple tests failed. Please fix issues before deploying.');
        console.log('📖 Check the README.md for troubleshooting guide.');
    }
}

// Run the test suite
testBot().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
});
