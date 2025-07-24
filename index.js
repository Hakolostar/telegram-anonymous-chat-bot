// Telegram Anonymous Chat Bot
// Built with Telegraf v4 and MongoDB/Redis
require('dotenv').config();

const { Telegraf, Markup, session, Scenes, Stage } = require('telegraf');
const { MongoClient } = require('mongodb');
const redis = require('redis');
const Joi = require('joi');
const moment = require('moment');
const Filter = require('bad-words');

// Initialize filter for inappropriate content
const filter = new Filter();

// Bot configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const REDIS_URL = process.env.REDIS_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is required in environment variables');
    process.exit(1);
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Database clients
let db = null;
let redisClient = null;

// In-memory fallback for development
let memoryUsers = new Map();
let memoryQueue = new Map();
let memoryMatches = new Map();

// Constants
const INTERESTS = [
    '💻 Technology', '🎵 Music', '✈️ Travel', '🏛️ Politics', 
    '🎬 Movies', '🎮 Gaming', '📚 Books', '🏃 Sports',
    '🍳 Cooking', '🎨 Art', '📸 Photography', '🧘 Meditation',
    '🌱 Nature', '💼 Business', '🔬 Science', '🎭 Theater',
    '🚗 Cars', '👗 Fashion', '🏠 DIY', '🐕 Pets'
];

const EDUCATION_LEVELS = [
    'High School', 'Bachelor', 'Master', 'PhD', 'Other'
];

const LANGUAGES = [
    'Amharic', 'English', 'Spanish', 'French', 'Arabic', 
    'Chinese', 'German', 'Italian', 'Portuguese', 'Russian', 'Other'
];

const GENDERS = ['Male', 'Female'];
const GENDER_PREFERENCES = ['Any', 'Male only', 'Female only'];

// Validation schemas
const profileSchema = Joi.object({
    _id: Joi.any().optional(), // Allow MongoDB _id field
    userId: Joi.number().required(),
    username: Joi.string().allow(''),
    firstName: Joi.string().required(),
    age: Joi.number().min(18).max(100).required(), // Updated minimum age to 18
    gender: Joi.string().valid(...GENDERS).required(),
    education: Joi.string().valid(...EDUCATION_LEVELS).required(),
    interests: Joi.array().items(Joi.string()).min(1).max(10).required(),
    preferredGender: Joi.string().valid(...GENDER_PREFERENCES).required(),
    language: Joi.array().items(Joi.string().valid(...LANGUAGES)).min(1).max(5).required(),
    createdAt: Joi.date().default(Date.now),
    lastActive: Joi.date().default(Date.now),
    isActive: Joi.boolean().default(true),
    isBanned: Joi.boolean().default(false),
    bannedAt: Joi.date().optional(), // Allow banned date
    banReason: Joi.string().optional(), // Allow ban reason
    bannedBy: Joi.number().optional(), // Allow banned by admin ID
    unbannedAt: Joi.date().optional(), // Allow unban date
    unbannedBy: Joi.number().optional(), // Allow unbanned by admin ID
    lastBanReason: Joi.string().optional(), // Allow previous ban reason history
    lastBannedAt: Joi.date().optional(), // Allow previous ban date history
    appealText: Joi.string().optional(), // Appeal message
    appealedAt: Joi.date().optional(), // When appeal was submitted
    appealStatus: Joi.string().valid('pending', 'approved', 'denied').optional(), // Appeal status
    appealReviewedBy: Joi.number().optional(), // Admin who reviewed appeal
    appealReviewedAt: Joi.date().optional(), // When appeal was reviewed
    appealDenyReason: Joi.string().optional() // Reason for appeal denial
});

// Utility function to safely edit messages
async function safeEditMessage(ctx, messageId, text, extra = {}) {
    try {
        if (messageId) {
            await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, text, extra);
        } else {
            await ctx.editMessageText(text, extra);
        }
    } catch (error) {
        if (error.description && error.description.includes('message is not modified')) {
            console.log('Message edit skipped - content unchanged');
            return;
        }
        console.error('Error editing message:', error);
        throw error;
    }
}

async function safeEditReplyMarkup(ctx, markup, messageId = null) {
    try {
        if (messageId) {
            await ctx.telegram.editMessageReplyMarkup(ctx.chat.id, messageId, undefined, markup);
        } else {
            await ctx.editMessageReplyMarkup(markup);
        }
    } catch (error) {
        if (error.description && error.description.includes('message is not modified')) {
            console.log('Message reply markup edit skipped - content unchanged');
            return;
        }
        console.error('Error editing reply markup:', error);
        throw error;
    }
}

// Database initialization
async function initDatabase() {
    try {
        if (MONGO_URI) {
            console.log('🔌 Connecting to MongoDB...');
            const client = new MongoClient(MONGO_URI);
            await client.connect();
            db = client.db('anonymous_chat_bot');
            
            // Create indexes
            await db.collection('users').createIndex({ userId: 1 }, { unique: true });
            await db.collection('matches').createIndex({ participants: 1 });
            await db.collection('queue').createIndex({ userId: 1 }, { unique: true });
            
            console.log('✅ MongoDB connected successfully');
        } else if (REDIS_URL) {
            console.log('🔌 Connecting to Redis...');
            redisClient = redis.createClient({ url: REDIS_URL });
            await redisClient.connect();
            console.log('✅ Redis connected successfully');
        } else {
            console.log('⚠️  Using in-memory storage (not recommended for production)');
        }
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('📝 Falling back to in-memory storage');
    }
}

// Database operations
class DatabaseOperations {
    // Track all users who ever started the bot
    static async addToAllUsers(userId) {
        try {
            if (db) {
                await db.collection('all_users').updateOne(
                    { userId },
                    { $set: { userId } },
                    { upsert: true }
                );
            } else if (redisClient) {
                await redisClient.sAdd('all_users', userId.toString());
            } else {
                if (!global._allUsersSet) global._allUsersSet = new Set();
                global._allUsersSet.add(userId);
            }
        } catch (error) {
            console.error('Error adding to all_users:', error);
        }
    }

    static async getAllUserCount() {
        try {
            if (db) {
                return await db.collection('all_users').countDocuments();
            } else if (redisClient) {
                return await redisClient.sCard('all_users');
            } else {
                return global._allUsersSet ? global._allUsersSet.size : 0;
            }
        } catch (error) {
            console.error('Error getting all user count:', error);
            return 0;
        }
    }
    // User operations
    static async saveUser(userProfile) {
        try {
            const { error, value } = profileSchema.validate(userProfile);
            if (error) throw new Error(`Validation error: ${error.details[0].message}`);

            if (db) {
                await db.collection('users').replaceOne(
                    { userId: value.userId },
                    value,
                    { upsert: true }
                );
            } else if (redisClient) {
                await redisClient.set(`user:${value.userId}`, JSON.stringify(value));
            } else {
                memoryUsers.set(value.userId, value);
            }
            
            return value;
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    }

    static async getUser(userId) {
        try {
            if (db) {
                return await db.collection('users').findOne({ userId });
            } else if (redisClient) {
                const userData = await redisClient.get(`user:${userId}`);
                return userData ? JSON.parse(userData) : null;
            } else {
                return memoryUsers.get(userId) || null;
            }
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    static async updateUser(userId, updateData) {
        try {
            if (db) {
                await db.collection('users').updateOne(
                    { userId },
                    { $set: updateData }
                );
            } else if (redisClient) {
                const userData = await this.getUser(userId);
                if (userData) {
                    const updatedUser = { ...userData, ...updateData };
                    await redisClient.set(`user:${userId}`, JSON.stringify(updatedUser));
                }
            } else {
                const userData = memoryUsers.get(userId);
                if (userData) {
                    memoryUsers.set(userId, { ...userData, ...updateData });
                }
            }
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    static async updateUserActivity(userId) {
        try {
            const updateData = { lastActive: new Date() };
            
            if (db) {
                await db.collection('users').updateOne(
                    { userId },
                    { $set: updateData }
                );
            } else if (redisClient) {
                const userData = await this.getUser(userId);
                if (userData) {
                    await redisClient.set(`user:${userId}`, JSON.stringify({
                        ...userData,
                        ...updateData
                    }));
                }
            } else {
                const userData = memoryUsers.get(userId);
                if (userData) {
                    memoryUsers.set(userId, { ...userData, ...updateData });
                }
            }
        } catch (error) {
            console.error('Error updating user activity:', error);
        }
    }

    // Queue operations
    static async addToQueue(userId, preferences = {}) {
        try {
            const queueEntry = {
                userId,
                preferences,
                timestamp: new Date(),
                chatId: preferences.chatId || userId,
                messageId: preferences.messageId || null,
                searchStartTime: preferences.searchStartTime || Date.now()
            };

            if (db) {
                await db.collection('queue').replaceOne(
                    { userId },
                    queueEntry,
                    { upsert: true }
                );
            } else if (redisClient) {
                await redisClient.set(`queue:${userId}`, JSON.stringify(queueEntry));
            } else {
                memoryQueue.set(userId, queueEntry);
            }

            console.log(`[DEBUG] Added user ${userId} to queue`);

            // Notify existing queue members about new user joining
            await this.notifyQueueAboutNewUser(userId);
        } catch (error) {
            console.error('Error adding to queue:', error);
        }
    }

    static async notifyQueueAboutNewUser(newUserId) {
        try {
            const newUser = await this.getUser(newUserId);
            if (!newUser) return;

            const queueEntries = await this.getQueueEntries();
            
            // Check if any existing queue members are compatible with the new user
            for (const entry of queueEntries) {
                if (entry.userId === newUserId) continue;
                
                const queuedUser = await this.getUser(entry.userId);
                if (!queuedUser || queuedUser.isBanned) continue;

                // Check compatibility
                const score = MatchingService?.calculateCompatibilityScore(queuedUser, newUser);
                if (score && score > 5) { // High compatibility threshold
                    try {
                        // Notify the queued user about potential match
                        await bot.telegram.sendMessage(entry.userId, 
                            '🔔 **Someone compatible just joined!**\n\n' +
                            '✨ High compatibility detected\n' +
                            '🔍 Use /find to connect instantly!', {
                            parse_mode: 'Markdown',
                            ...Markup.inlineKeyboard([
                                [Markup.button.callback('🔍 Find Match Now', 'find_match')]
                            ])
                        });
                    } catch (error) {
                        // User might have blocked the bot or deleted account
                        console.log(`Could not notify user ${entry.userId}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('Error notifying queue about new user:', error);
        }
    }

    static async removeFromQueue(userId) {
        try {
            if (db) {
                await db.collection('queue').deleteOne({ userId });
            } else if (redisClient) {
                await redisClient.del(`queue:${userId}`);
            } else {
                memoryQueue.delete(userId);
            }
        } catch (error) {
            console.error('Error removing from queue:', error);
        }
    }

    static async getQueueEntries() {
        try {
            if (db) {
                return await db.collection('queue').find({}).toArray();
            } else if (redisClient) {
                const keys = await redisClient.keys('queue:*');
                const entries = [];
                for (const key of keys) {
                    const data = await redisClient.get(key);
                    if (data) entries.push(JSON.parse(data));
                }
                return entries;
            } else {
                return Array.from(memoryQueue.values());
            }
        } catch (error) {
            console.error('Error getting queue entries:', error);
            return [];
        }
    }

    // Match operations
    static async createMatch(user1Id, user2Id) {
        try {
            const matchId = `${Math.min(user1Id, user2Id)}_${Math.max(user1Id, user2Id)}`;
            const match = {
                id: matchId,
                participants: [user1Id, user2Id],
                createdAt: new Date(),
                isActive: true
            };

            console.log(`[DEBUG] Creating match ${matchId} for users ${user1Id} and ${user2Id}`);

            if (db) {
                // First, end any existing active matches for these users
                await db.collection('matches').updateMany(
                    { 
                        participants: { $in: [user1Id, user2Id] },
                        isActive: true 
                    },
                    { $set: { isActive: false, endedAt: new Date() } }
                );
                
                // Create the new match
                await db.collection('matches').insertOne(match);
                console.log(`[DEBUG] MongoDB match created: ${matchId}`);
            } else if (redisClient) {
                await redisClient.set(`match:${matchId}`, JSON.stringify(match));
                await redisClient.set(`user_match:${user1Id}`, matchId);
                await redisClient.set(`user_match:${user2Id}`, matchId);
            } else {
                memoryMatches.set(matchId, match);
                memoryMatches.set(`user_${user1Id}`, matchId);
                memoryMatches.set(`user_${user2Id}`, matchId);
            }

            return matchId;
        } catch (error) {
            console.error('Error creating match:', error);
            throw error;
        }
    }

    static async getActiveMatch(userId) {
        try {
            console.log(`[DEBUG] getActiveMatch called for user ${userId}`);
            if (db) {
                const result = await db.collection('matches').findOne({
                    participants: userId,
                    isActive: true
                });
                console.log(`[DEBUG] MongoDB getActiveMatch result:`, result);
                return result;
            } else if (redisClient) {
                const matchId = await redisClient.get(`user_match:${userId}`);
                console.log(`[DEBUG] Redis user_match:${userId} = ${matchId}`);
                if (matchId) {
                    const matchData = await redisClient.get(`match:${matchId}`);
                    if (matchData) {
                        const match = JSON.parse(matchData);
                        console.log(`[DEBUG] Redis match data:`, match);
                        // Return only if match is active
                        return match.isActive ? match : null;
                    }
                }
                return null;
            } else {
                const matchId = memoryMatches.get(`user_${userId}`);
                console.log(`[DEBUG] Memory user_${userId} = ${matchId}`);
                if (matchId) {
                    const match = memoryMatches.get(matchId);
                    console.log(`[DEBUG] Memory match data:`, match);
                    // Return only if match exists and is active
                    return (match && match.isActive) ? match : null;
                }
                return null;
            }
        } catch (error) {
            console.error('Error getting active match:', error);
            return null;
        }
    }

    static async endMatch(matchId) {
        try {
            console.log(`[DEBUG] endMatch called for match ${matchId}`);
            if (db) {
                // First, get all matches with this ID to see participants
                const matches = await db.collection('matches').find({ id: matchId }).toArray();
                console.log(`[DEBUG] MongoDB matches found with ID ${matchId}:`, matches);
                
                if (matches.length > 0) {
                    // Update ALL matches with this ID to inactive
                    const updateResult = await db.collection('matches').updateMany(
                        { id: matchId },
                        { $set: { isActive: false, endedAt: new Date() } }
                    );
                    console.log(`[DEBUG] MongoDB update result:`, updateResult);
                    console.log(`[DEBUG] Updated ${updateResult.modifiedCount} matches for ID ${matchId}`);
                    
                    // Get participants from the first match
                    const participants = matches[0].participants;
                    console.log(`[DEBUG] Match ended successfully for participants:`, participants);
                }
            } else if (redisClient) {
                const matchData = await redisClient.get(`match:${matchId}`);
                if (matchData) {
                    const match = JSON.parse(matchData);
                    console.log(`[DEBUG] Redis match before ending:`, match);
                    await redisClient.set(`match:${matchId}`, JSON.stringify({
                        ...match,
                        isActive: false,
                        endedAt: new Date()
                    }));
                    
                    // Remove user match references
                    for (const userId of match.participants) {
                        await redisClient.del(`user_match:${userId}`);
                    }
                    console.log(`[DEBUG] Removed Redis user match references for participants:`, match.participants);
                }
            } else {
                const match = memoryMatches.get(matchId);
                console.log(`[DEBUG] Memory match before ending:`, match);
                if (match) {
                    match.isActive = false;
                    match.endedAt = new Date();
                    
                    // Remove user match references from memory
                    for (const userId of match.participants) {
                        memoryMatches.delete(`user_${userId}`);
                    }
                    console.log(`[DEBUG] Removed memory user match references for participants:`, match.participants);
                }
            }
            console.log(`[DEBUG] endMatch completed for match ${matchId}`);
        } catch (error) {
            console.error('Error ending match:', error);
        }
    }
}

// Matching algorithm
class MatchingService {
    static calculateCompatibilityScore(user1, user2) {
        let score = 0;

        // Check mutual gender preferences
        if (!this.checkGenderCompatibility(user1, user2)) {
            return -1; // Incompatible
        }

        // Shared interests (+5 each)
        const sharedInterests = user1.interests.filter(interest => 
            user2.interests.includes(interest)
        );
        score += sharedInterests.length * 5;

        // Age compatibility (+3 if within reasonable range)
        const ageDiff = Math.abs(user1.age - user2.age);
        if (ageDiff <= 5) score += 3;
        else if (ageDiff <= 10) score += 1;

        // Language match (+2 for each shared language)
        const sharedLanguages = user1.language.filter(lang => 
            user2.language.includes(lang)
        );
        score += sharedLanguages.length * 2;

        // Education level bonus (+1)
        if (user1.education === user2.education) score += 1;

        return score;
    }

    static checkGenderCompatibility(user1, user2) {
        // Check if user1 wants user2's gender
        const user1WantsUser2 = user1.preferredGender === 'Any' || 
                               user1.preferredGender.replace(' only', '') === user2.gender;

        // Check if user2 wants user1's gender
        const user2WantsUser1 = user2.preferredGender === 'Any' || 
                               user2.preferredGender.replace(' only', '') === user1.gender;

        return user1WantsUser2 && user2WantsUser1;
    }

    static async findBestMatch(currentUser) {
        try {
            const queueEntries = await DatabaseOperations.getQueueEntries();
            let bestMatch = null;
            let bestScore = -1;

            for (const entry of queueEntries) {
                if (entry.userId === currentUser.userId) continue;

                const candidateUser = await DatabaseOperations.getUser(entry.userId);
                if (!candidateUser || candidateUser.isBanned) continue;

                const score = this.calculateCompatibilityScore(currentUser, candidateUser);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = candidateUser;
                }
            }

            return bestScore >= 0 ? bestMatch : null;
        } catch (error) {
            console.error('Error finding match:', error);
            return null;
        }
    }

    // Improved non-blocking matching system
    static async startMatchingProcess(currentUser, ctx) {
        console.log(`[DEBUG] Starting matching process for user ${currentUser.userId}`);
        
        // First, try immediate matching
        const immediateMatch = await this.findBestMatch(currentUser);
        if (immediateMatch) {
            console.log(`[DEBUG] Immediate match found for user ${currentUser.userId} with ${immediateMatch.userId}`);
            return immediateMatch;
        }

        // If no immediate match, add to queue and set up periodic checking
        await DatabaseOperations.addToQueue(currentUser.userId, {
            searchStartTime: Date.now(),
            chatId: ctx.chat.id,
            messageId: null
        });

        // Send initial searching message
        const searchingMessage = await ctx.reply(
            '🔍 **Searching for your perfect match...**\n\n' +
            '⏳ Looking for compatible users...\n' +
            '🎯 We\'ll notify you when someone joins!\n\n' +
            '_You can continue using other features while we search_',
            { parse_mode: 'Markdown' }
        );

        // Store message ID for updates
        if (db) {
            await db.collection('queue').updateOne(
                { userId: currentUser.userId },
                { $set: { messageId: searchingMessage.message_id } }
            );
        } else if (redisClient) {
            const queueData = await redisClient.get(`queue:${currentUser.userId}`);
            if (queueData) {
                const queue = JSON.parse(queueData);
                queue.messageId = searchingMessage.message_id;
                await redisClient.set(`queue:${currentUser.userId}`, JSON.stringify(queue));
            }
        } else {
            const queue = memoryQueue.get(currentUser.userId);
            if (queue) {
                queue.messageId = searchingMessage.message_id;
                memoryQueue.set(currentUser.userId, queue);
            }
        }

        console.log(`[DEBUG] User ${currentUser.userId} added to queue with message ID ${searchingMessage.message_id}`);
        return null; // No immediate match, user is now in queue
    }

    // Background matching service that runs continuously
    static async runBackgroundMatchingService() {
        console.log('[DEBUG] Starting background matching service...');
        
        setInterval(async () => {
            try {
                await this.processMatchingQueue();
            } catch (error) {
                console.error('[ERROR] Background matching service error:', error);
            }
        }, 5000); // Check every 5 seconds
    }

    static async processMatchingQueue() {
        try {
            const queueEntries = await DatabaseOperations.getQueueEntries();
            if (queueEntries.length < 2) return; // Need at least 2 users to match

            console.log(`[DEBUG] Processing queue with ${queueEntries.length} users`);

            // Sort by search start time (oldest first) for fairness
            queueEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            const processedUsers = new Set();

            for (let i = 0; i < queueEntries.length; i++) {
                if (processedUsers.has(queueEntries[i].userId)) continue;

                const user1 = await DatabaseOperations.getUser(queueEntries[i].userId);
                if (!user1 || user1.isBanned) continue;

                // Check if user is still in queue (might have been matched already)
                const stillInQueue = await DatabaseOperations.getQueueEntries();
                if (!stillInQueue.find(q => q.userId === user1.userId)) continue;

                // Look for a compatible partner
                for (let j = i + 1; j < queueEntries.length; j++) {
                    if (processedUsers.has(queueEntries[j].userId)) continue;

                    const user2 = await DatabaseOperations.getUser(queueEntries[j].userId);
                    if (!user2 || user2.isBanned) continue;

                    // Check compatibility
                    const compatibilityScore = this.calculateCompatibilityScore(user1, user2);
                    if (compatibilityScore >= 0) { // Compatible match found
                        console.log(`[DEBUG] Match found: ${user1.userId} + ${user2.userId} (score: ${compatibilityScore})`);
                        
                        // Remove both users from queue
                        await DatabaseOperations.removeFromQueue(user1.userId);
                        await DatabaseOperations.removeFromQueue(user2.userId);
                        
                        // Create the match
                        const matchId = await DatabaseOperations.createMatch(user1.userId, user2.userId);
                        console.log(`[DEBUG] Created match: ${matchId}`);
                        
                        // Notify both users
                        await this.notifyMatchFound(user1.userId, queueEntries[i]);
                        await this.notifyMatchFound(user2.userId, queueEntries[j]);
                        
                        processedUsers.add(user1.userId);
                        processedUsers.add(user2.userId);
                        break;
                    }
                }
            }

            // Update search status for users still in queue
            await this.updateQueueUsersStatus(queueEntries, processedUsers);

        } catch (error) {
            console.error('[ERROR] Error processing matching queue:', error);
        }
    }

    static async notifyMatchFound(userId, queueEntry) {
        try {
            const matchFoundMessage = 
                '🎉 **Match Found!**\n\n' +
                '✨ You\'ve been connected with someone!\n' +
                '👨/👩 Messages will show gender indicators\n' +
                '📝 Start chatting now!';

            if (queueEntry.messageId) {
                // Update the searching message
                try {
                    await bot.telegram.editMessageText(
                        queueEntry.chatId || userId,
                        queueEntry.messageId,
                        undefined,
                        matchFoundMessage,
                        { parse_mode: 'Markdown' }
                    );
                } catch (editError) {
                    // If edit fails, send new message
                    await bot.telegram.sendMessage(userId, matchFoundMessage, {
                        parse_mode: 'Markdown'
                    });
                }
            } else {
                await bot.telegram.sendMessage(userId, matchFoundMessage, {
                    parse_mode: 'Markdown'
                });
            }

            // Send chat keyboard
            await bot.telegram.sendMessage(userId, 
                '💬 **Chat Controls**\n\nUse the buttons below to manage your conversation:', {
                parse_mode: 'Markdown',
                ...createChatKeyboard()
            });

            console.log(`[DEBUG] Notified user ${userId} about match`);
        } catch (error) {
            console.error(`[ERROR] Failed to notify user ${userId} about match:`, error);
        }
    }

    static async updateQueueUsersStatus(queueEntries, processedUsers) {
        for (const entry of queueEntries) {
            if (processedUsers.has(entry.userId)) continue;

            try {
                const searchTime = Math.floor((Date.now() - new Date(entry.timestamp).getTime()) / 1000);
                
                // Update status every 15 seconds
                if (searchTime % 15 === 0 && entry.messageId) {
                    const statusMessage = 
                        '🔍 **Still searching...**\n\n' +
                        `⏳ Search time: ${Math.floor(searchTime / 60)}m ${searchTime % 60}s\n` +
                        '� Looking for compatible users\n' +
                        '� You can use other bot features while waiting\n\n' +
                        '_We\'ll notify you instantly when someone joins!_';

                    try {
                        await bot.telegram.editMessageText(
                            entry.chatId || entry.userId,
                            entry.messageId,
                            undefined,
                            statusMessage,
                            { parse_mode: 'Markdown' }
                        );
                    } catch (editError) {
                        // Message might be too old or deleted, ignore
                    }
                }

                // Remove users who have been searching for too long (10 minutes)
                if (searchTime > 600) {
                    await DatabaseOperations.removeFromQueue(entry.userId);
                    
                    const timeoutMessage = 
                        '⏰ **Search timeout**\n\n' +
                        '😔 No matches found in the last 10 minutes\n' +
                        '🔄 You can try searching again anytime\n' +
                        '� Try updating your profile for better matches!';

                    if (entry.messageId) {
                        try {
                            await bot.telegram.editMessageText(
                                entry.chatId || entry.userId,
                                entry.messageId,
                                undefined,
                                timeoutMessage,
                                { parse_mode: 'Markdown' }
                            );
                        } catch (editError) {
                            await bot.telegram.sendMessage(entry.userId, timeoutMessage, {
                                parse_mode: 'Markdown'
                            });
                        }
                    } else {
                        await bot.telegram.sendMessage(entry.userId, timeoutMessage, {
                            parse_mode: 'Markdown'
                        });
                    }

                    // Send main menu keyboard
                    await bot.telegram.sendMessage(entry.userId, 
                        '🏠 **Main Menu**\n\nWhat would you like to do next?', {
                        parse_mode: 'Markdown',
                        ...createMainMenuKeyboard()
                    });

                    console.log(`[DEBUG] Removed user ${entry.userId} from queue due to timeout`);
                }
            } catch (error) {
                console.error(`[ERROR] Failed to update status for user ${entry.userId}:`, error);
            }
        }
    }
}

// Reply Keyboard Navigation Functions
function createMainMenuKeyboard() {
    return Markup.keyboard([
        ['🔍 Find Match', '👤 My Profile'],
        ['❓ Help', '📊 Menu']
    ]).resize().persistent();
}

// Function to show main menu
async function showMainMenu(ctx) {
    const user = await DatabaseOperations.getUser(ctx.from.id);
    if (!user) {
        await ctx.reply('❌ You need to create a profile first. Use /start to begin!');
        return;
    }
    
    await ctx.reply(
        '🏠 **Main Menu**\n\n' +
        '🔍 Find Match - Connect with someone new\n' +
        '👤 My Profile - View or edit your profile\n' +
        '❓ Help - Get assistance\n' +
        '📊 Menu - Show this menu',
        {
            parse_mode: 'Markdown',
            ...createMainMenuKeyboard()
        }
    );
}

function createChatKeyboard() {
    return Markup.keyboard([
        ['🚪 End Chat'],
        ['📊 Menu']
    ]).resize().persistent();
}

function createSearchingKeyboard() {
    return Markup.keyboard([
        ['❌ Cancel Search'],
        ['📊 Menu']
    ]).resize().persistent();
}

function createProfileKeyboard() {
    return Markup.keyboard([
        ['✏️ Edit Profile', '🔍 Find Match'],
        ['📊 Menu']
    ]).resize().persistent();
}

function removeKeyboard() {
    return Markup.removeKeyboard();
}

// Helper functions for profile setup keyboards
function createLanguageKeyboard(selectedLanguages = []) {
    const keyboard = [];
    const languageRows = [];
    
    for (let i = 0; i < LANGUAGES.length; i += 2) {
        const row = [];
        const lang1 = LANGUAGES[i];
        const lang2 = LANGUAGES[i + 1];
        
        const lang1Text = selectedLanguages.includes(lang1) ? `✅ ${lang1}` : lang1;
        row.push(Markup.button.callback(lang1Text, `lang_${lang1}`));
        
        if (lang2) {
            const lang2Text = selectedLanguages.includes(lang2) ? `✅ ${lang2}` : lang2;
            row.push(Markup.button.callback(lang2Text, `lang_${lang2}`));
        }
        
        languageRows.push(row);
    }
    
    languageRows.push([Markup.button.callback('✅ Done', 'languages_done')]);
    
    return Markup.inlineKeyboard(languageRows);
}

function createInterestsKeyboard(selectedInterests = []) {
    const keyboard = [];
    const interestRows = [];
    
    for (let i = 0; i < INTERESTS.length; i += 2) {
        const row = [];
        const interest1 = INTERESTS[i];
        const interest2 = INTERESTS[i + 1];
        
        const interest1Text = selectedInterests.includes(interest1) ? `✅ ${interest1}` : interest1;
        row.push(Markup.button.callback(interest1Text, `interest_${interest1}`));
        
        if (interest2) {
            const interest2Text = selectedInterests.includes(interest2) ? `✅ ${interest2}` : interest2;
            row.push(Markup.button.callback(interest2Text, `interest_${interest2}`));
        }
        
        interestRows.push(row);
    }
    
    interestRows.push([Markup.button.callback('✅ Done', 'interests_done')]);
    
    return Markup.inlineKeyboard(interestRows);
}

// Scene for profile setup
const profileSetupScene = new Scenes.BaseScene('PROFILE_SETUP');
profileSetupScene.enter(async (ctx) => {
    ctx.session.profileData = ctx.session.profileData || {};
    await ctx.reply('👋 Welcome! Let\'s set up your profile.\n\n🎂 Please enter your age (18-100):');
});

profileSetupScene.on('text', async (ctx) => {
    const { profileData } = ctx.session;
    const text = ctx.message.text;

    try {
        if (!profileData.age) {
            const age = parseInt(text);
            if (age >= 18 && age <= 100) {
                profileData.age = age;
                await ctx.reply('👤 What\'s your gender?', 
                    Markup.inlineKeyboard([
                        [Markup.button.callback('👨 Male', 'gender_Male')],
                        [Markup.button.callback('👩 Female', 'gender_Female')]
                    ])
                );
            } else {
                await ctx.reply('❌ Please enter a valid age between 18 and 100:');
            }
        } else if (!profileData.language && profileData.gender && profileData.education) {
            // Handle language selection after education
            if (LANGUAGES.includes(text)) {
                profileData.language = text;
                await ctx.reply('🎯 Great! Now select your interests (choose multiple):', 
                    createInterestsKeyboard(profileData.interests || [])
                );
            } else {
                await ctx.reply('❌ Please select a valid language from the keyboard above.');
            }
        }
    } catch (error) {
        console.error('Profile setup error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
});

profileSetupScene.action(/gender_(.+)/, async (ctx) => {
    const gender = ctx.match[1];
    ctx.session.profileData.gender = gender;
    
    await ctx.editMessageText('🎓 What\'s your education level?', 
        Markup.inlineKeyboard([
            [Markup.button.callback('🏫 High School', 'edu_High School')],
            [Markup.button.callback('🎓 Bachelor', 'edu_Bachelor')],
            [Markup.button.callback('📚 Master', 'edu_Master')],
            [Markup.button.callback('🔬 PhD', 'edu_PhD')],
            [Markup.button.callback('📖 Other', 'edu_Other')]
        ])
    );
});

profileSetupScene.action(/edu_(.+)/, async (ctx) => {
    const education = ctx.match[1];
    ctx.session.profileData.education = education;
    
    await ctx.editMessageText('🌍 What languages do you speak? (select multiple):', 
        createLanguageKeyboard(ctx.session.profileData.language || [])
    );
});

profileSetupScene.action(/lang_(.+)/, async (ctx) => {
    const language = ctx.match[1];
    const { profileData } = ctx.session;
    
    if (!profileData.language) profileData.language = [];
    
    const originalLanguages = [...profileData.language];
    
    if (profileData.language.includes(language)) {
        profileData.language = profileData.language.filter(l => l !== language);
    } else if (profileData.language.length < 5) {
        profileData.language.push(language);
    } else {
        await ctx.answerCbQuery('You can select up to 5 languages maximum');
        return;
    }
    
    // Only edit the message if languages actually changed
    if (JSON.stringify(originalLanguages.sort()) !== JSON.stringify(profileData.language.sort())) {
        try {
            await ctx.editMessageReplyMarkup(createLanguageKeyboard(profileData.language).reply_markup);
        } catch (error) {
            if (error.description && error.description.includes('message is not modified')) {
                console.log('Message edit skipped - content unchanged');
            } else {
                console.error('Error editing message:', error);
            }
        }
    }
    
    await ctx.answerCbQuery();
});

profileSetupScene.action('languages_done', async (ctx) => {
    const { profileData } = ctx.session;
    
    if (!profileData.language || profileData.language.length === 0) {
        await ctx.answerCbQuery('❌ Please select at least one language');
        return;
    }
    
    await ctx.editMessageText('🎯 Great! Now select your interests (choose multiple):', 
        createInterestsKeyboard(profileData.interests || [])
    );
});

profileSetupScene.action(/interest_(.+)/, async (ctx) => {
    const interest = ctx.match[1];
    const { profileData } = ctx.session;
    
    if (!profileData.interests) profileData.interests = [];
    
    const originalInterests = [...profileData.interests];
    
    if (profileData.interests.includes(interest)) {
        profileData.interests = profileData.interests.filter(i => i !== interest);
    } else if (profileData.interests.length < 10) {
        profileData.interests.push(interest);
    } else {
        // User has reached maximum interests, just answer the callback
        await ctx.answerCbQuery('You can select up to 10 interests maximum');
        return;
    }
    
    // Only edit the message if interests actually changed
    if (JSON.stringify(originalInterests.sort()) !== JSON.stringify(profileData.interests.sort())) {
        try {
            await ctx.editMessageReplyMarkup(createInterestsKeyboard(profileData.interests).reply_markup);
        } catch (error) {
            if (error.description && error.description.includes('message is not modified')) {
                // Ignore this specific error - message content hasn't changed
                console.log('Message edit skipped - content unchanged');
            } else {
                console.error('Error editing message:', error);
            }
        }
    }
    
    await ctx.answerCbQuery();
});

profileSetupScene.action('interests_done', async (ctx) => {
    const { profileData } = ctx.session;
    
    if (!profileData.interests || profileData.interests.length === 0) {
        await ctx.answerCbQuery('❌ Please select at least one interest');
        return;
    }
    
    await ctx.editMessageText('💕 Who would you like to chat with?', 
        Markup.inlineKeyboard([
            [Markup.button.callback('👥 Anyone', 'pref_Any')],
            [Markup.button.callback('👨 Male only', 'pref_Male only')],
            [Markup.button.callback('👩 Female only', 'pref_Female only')]
        ])
    );
});

profileSetupScene.action(/pref_(.+)/, async (ctx) => {
    const preference = ctx.match[1];
    const { profileData } = ctx.session;
    profileData.preferredGender = preference;
    
    // Save complete profile
    try {
        const completeProfile = {
            userId: ctx.from.id,
            username: ctx.from.username || '',
            firstName: ctx.from.first_name,
            ...profileData
        };
        
        await DatabaseOperations.saveUser(completeProfile);
        
        await ctx.editMessageText(
            '✅ **Profile created successfully!**\n\n' +
            '🎉 Welcome to Anonymous Chat!\n' +
            '🔍 Use the menu below to start chatting!',
            { parse_mode: 'Markdown' }
        );
        
        // Send main menu keyboard in a new message
        await ctx.reply(
            '🏠 **Main Menu**\n\n' +
            '👋 What would you like to do?',
            {
                parse_mode: 'Markdown',
                ...createMainMenuKeyboard()
            }
        );
        
        ctx.session.profileData = null;
        return ctx.scene.leave();
    } catch (error) {
        console.error('Error saving profile:', error);
        await ctx.reply('❌ Error saving profile. Please try again.');
    }
});

// Create stage and register scene
const editProfileScene = new Scenes.BaseScene('EDIT_PROFILE');

editProfileScene.enter(async (ctx) => {
    try {
        const user = await DatabaseOperations.getUser(ctx.from.id);
        if (!user) {
            await ctx.reply('❌ Profile not found. Please create a profile first.');
            return ctx.scene.leave();
        }
        
        ctx.session.currentUser = user;
        await ctx.reply(
            '✏️ **Edit Your Profile**\n\n' +
            'Select what you\'d like to update:',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🎂 Age', 'edit_age')],
                    [Markup.button.callback('👤 Gender', 'edit_gender')],
                    [Markup.button.callback('🎓 Education', 'edit_education')],
                    [Markup.button.callback('🌍 Languages', 'edit_languages')],
                    [Markup.button.callback('🎯 Interests', 'edit_interests')],
                    [Markup.button.callback('💕 Preference', 'edit_preference')],
                    [Markup.button.callback('❌ Cancel', 'edit_cancel')]
                ])
            }
        );
    } catch (error) {
        console.error('Error entering edit profile:', error);
        await ctx.reply('❌ An error occurred. Please try again.');
        return ctx.scene.leave();
    }
});

// Edit Age
editProfileScene.action('edit_age', async (ctx) => {
    ctx.session.editField = 'age';
    try {
        await ctx.editMessageText(
            '🎂 Please enter your new age (18-100):\n\n' +
            '💡 Just type your age number and send it.',
            Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Back', 'back_to_menu')]
            ])
        );
    } catch (editError) {
        // If editing fails, send a new message
        await ctx.reply(
            '🎂 Please enter your new age (18-100):\n\n' +
            '💡 Just type your age number and send it.',
            Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Back', 'back_to_menu')]
            ])
        );
    }
});

// Edit Gender
editProfileScene.action('edit_gender', async (ctx) => {
    try {
        await ctx.editMessageText('👤 Select your gender:', 
            Markup.inlineKeyboard([
                [Markup.button.callback('👨 Male', 'set_gender_Male')],
                [Markup.button.callback('👩 Female', 'set_gender_Female')],
                [Markup.button.callback('⬅️ Back', 'back_to_menu')]
            ])
        );
    } catch (editError) {
        await ctx.reply('👤 Select your gender:', 
            Markup.inlineKeyboard([
                [Markup.button.callback('👨 Male', 'set_gender_Male')],
                [Markup.button.callback('👩 Female', 'set_gender_Female')],
                [Markup.button.callback('⬅️ Back', 'back_to_menu')]
            ])
        );
    }
});

// Edit Education
editProfileScene.action('edit_education', async (ctx) => {
    try {
        await ctx.editMessageText('🎓 Select your education level:', 
            Markup.inlineKeyboard([
                [Markup.button.callback('🏫 High School', 'set_edu_High School')],
                [Markup.button.callback('🎓 Bachelor', 'set_edu_Bachelor')],
                [Markup.button.callback('📚 Master', 'set_edu_Master')],
                [Markup.button.callback('🔬 PhD', 'set_edu_PhD')],
                [Markup.button.callback('📖 Other', 'set_edu_Other')],
                [Markup.button.callback('⬅️ Back', 'back_to_menu')]
            ])
        );
    } catch (editError) {
        await ctx.reply('🎓 Select your education level:', 
            Markup.inlineKeyboard([
                [Markup.button.callback('🏫 High School', 'set_edu_High School')],
                [Markup.button.callback('🎓 Bachelor', 'set_edu_Bachelor')],
                [Markup.button.callback('📚 Master', 'set_edu_Master')],
                [Markup.button.callback('🔬 PhD', 'set_edu_PhD')],
                [Markup.button.callback('📖 Other', 'set_edu_Other')],
                [Markup.button.callback('⬅️ Back', 'back_to_menu')]
            ])
        );
    }
});

// Edit Languages
editProfileScene.action('edit_languages', async (ctx) => {
    const currentLanguages = ctx.session.currentUser.language || [];
    ctx.session.editField = 'languages';
    try {
        await ctx.editMessageText('🌍 Select your languages (current selection will be updated):', 
            createLanguageKeyboard(currentLanguages)
        );
    } catch (editError) {
        await ctx.reply('🌍 Select your languages (current selection will be updated):', 
            createLanguageKeyboard(currentLanguages)
        );
    }
});

// Edit Interests
editProfileScene.action('edit_interests', async (ctx) => {
    const currentInterests = ctx.session.currentUser.interests || [];
    ctx.session.editField = 'interests';
    try {
        await ctx.editMessageText('🎯 Select your interests (current selection will be updated):', 
            createInterestsKeyboard(currentInterests)
        );
    } catch (editError) {
        await ctx.reply('🎯 Select your interests (current selection will be updated):', 
            createInterestsKeyboard(currentInterests)
        );
    }
});

// Edit Preference
editProfileScene.action('edit_preference', async (ctx) => {
    try {
        await ctx.editMessageText('💕 Who would you like to chat with?', 
            Markup.inlineKeyboard([
                [Markup.button.callback('👥 Anyone', 'set_pref_Any')],
                [Markup.button.callback('👨 Male only', 'set_pref_Male only')],
                [Markup.button.callback('👩 Female only', 'set_pref_Female only')],
                [Markup.button.callback('⬅️ Back', 'back_to_menu')]
            ])
        );
    } catch (editError) {
        await ctx.reply('💕 Who would you like to chat with?', 
            Markup.inlineKeyboard([
                [Markup.button.callback('👥 Anyone', 'set_pref_Any')],
                [Markup.button.callback('👨 Male only', 'set_pref_Male only')],
                [Markup.button.callback('👩 Female only', 'set_pref_Female only')],
                [Markup.button.callback('⬅️ Back', 'back_to_menu')]
            ])
        );
    }
});

// Handle text input for age
editProfileScene.on('text', async (ctx) => {
    if (ctx.session.editField === 'age') {
        const age = parseInt(ctx.message.text);
        if (age >= 18 && age <= 100) {
            await updateUserField(ctx, 'age', age);
        } else {
            await ctx.reply('❌ Please enter a valid age between 18 and 100:');
        }
    }
});

// Handle gender selection
editProfileScene.action(/set_gender_(.+)/, async (ctx) => {
    const gender = ctx.match[1];
    await updateUserField(ctx, 'gender', gender);
});

// Handle education selection
editProfileScene.action(/set_edu_(.+)/, async (ctx) => {
    const education = ctx.match[1];
    await updateUserField(ctx, 'education', education);
});

// Handle preference selection
editProfileScene.action(/set_pref_(.+)/, async (ctx) => {
    const preference = ctx.match[1];
    await updateUserField(ctx, 'preferredGender', preference);
});

// Handle language selection (reuse from profile setup)
editProfileScene.action(/lang_(.+)/, async (ctx) => {
    if (ctx.session.editField !== 'languages') return;
    
    const language = ctx.match[1];
    const currentLanguages = ctx.session.currentUser.language || [];
    
    let updatedLanguages = [...currentLanguages];
    
    if (updatedLanguages.includes(language)) {
        updatedLanguages = updatedLanguages.filter(l => l !== language);
    } else if (updatedLanguages.length < 5) {
        updatedLanguages.push(language);
    } else {
        await ctx.answerCbQuery('You can select up to 5 languages maximum');
        return;
    }
    
    ctx.session.currentUser.language = updatedLanguages;
    
    try {
        await ctx.editMessageReplyMarkup(createLanguageKeyboard(updatedLanguages).reply_markup);
    } catch (error) {
        if (!error.description?.includes('message is not modified')) {
            console.error('Error editing message:', error);
        }
    }
    
    await ctx.answerCbQuery();
});

editProfileScene.action('languages_done', async (ctx) => {
    if (ctx.session.editField !== 'languages') return;
    
    const languages = ctx.session.currentUser.language || [];
    if (languages.length === 0) {
        await ctx.answerCbQuery('❌ Please select at least one language');
        return;
    }
    
    await updateUserField(ctx, 'language', languages);
});

// Handle interest selection (reuse from profile setup)
editProfileScene.action(/interest_(.+)/, async (ctx) => {
    if (ctx.session.editField !== 'interests') return;
    
    const interest = ctx.match[1];
    const currentInterests = ctx.session.currentUser.interests || [];
    
    let updatedInterests = [...currentInterests];
    
    if (updatedInterests.includes(interest)) {
        updatedInterests = updatedInterests.filter(i => i !== interest);
    } else if (updatedInterests.length < 10) {
        updatedInterests.push(interest);
    } else {
        await ctx.answerCbQuery('You can select up to 10 interests maximum');
        return;
    }
    
    ctx.session.currentUser.interests = updatedInterests;
    
    try {
        await ctx.editMessageReplyMarkup(createInterestsKeyboard(updatedInterests).reply_markup);
    } catch (error) {
        if (!error.description?.includes('message is not modified')) {
            console.error('Error editing message:', error);
        }
    }
    
    await ctx.answerCbQuery();
});

editProfileScene.action('interests_done', async (ctx) => {
    if (ctx.session.editField !== 'interests') return;
    
    const interests = ctx.session.currentUser.interests || [];
    if (interests.length === 0) {
        await ctx.answerCbQuery('❌ Please select at least one interest');
        return;
    }
    
    await updateUserField(ctx, 'interests', interests);
});

// Back to edit menu
editProfileScene.action('back_to_menu', async (ctx) => {
    ctx.session.editField = null;
    try {
        await ctx.editMessageText(
            '✏️ **Edit Your Profile**\n\n' +
            'Select what you\'d like to update:',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🎂 Age', 'edit_age')],
                    [Markup.button.callback('👤 Gender', 'edit_gender')],
                    [Markup.button.callback('🎓 Education', 'edit_education')],
                    [Markup.button.callback('🌍 Languages', 'edit_languages')],
                    [Markup.button.callback('🎯 Interests', 'edit_interests')],
                    [Markup.button.callback('💕 Preference', 'edit_preference')],
                    [Markup.button.callback('❌ Cancel', 'edit_cancel')]
                ])
            }
        );
    } catch (editError) {
        await ctx.reply(
            '✏️ **Edit Your Profile**\n\n' +
            'Select what you\'d like to update:',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🎂 Age', 'edit_age')],
                    [Markup.button.callback('👤 Gender', 'edit_gender')],
                    [Markup.button.callback('🎓 Education', 'edit_education')],
                    [Markup.button.callback('🌍 Languages', 'edit_languages')],
                    [Markup.button.callback('🎯 Interests', 'edit_interests')],
                    [Markup.button.callback('💕 Preference', 'edit_preference')],
                    [Markup.button.callback('❌ Cancel', 'edit_cancel')]
                ])
            }
        );
    }
});

// Cancel editing
editProfileScene.action('edit_cancel', async (ctx) => {
    await ctx.editMessageText('❌ Edit cancelled.');
    setTimeout(async () => {
        await showMainMenu(ctx);
    }, 1000);
    return ctx.scene.leave();
});

// Go to main menu after successful update
editProfileScene.action('goto_main_menu', async (ctx) => {
    try {
        await ctx.editMessageText('✅ Profile updated successfully!');
    } catch (editError) {
        // If editing fails, just leave the scene
    }
    setTimeout(async () => {
        await showMainMenu(ctx);
    }, 500);
    return ctx.scene.leave();
});

// Helper function to update user field
async function updateUserField(ctx, field, value) {
    try {
        const updateData = { [field]: value };
        await DatabaseOperations.updateUser(ctx.from.id, updateData);
        
        let fieldName = field;
        if (field === 'preferredGender') fieldName = 'chat preference';
        
        // Try to edit the message first, if it fails, send a new message
        try {
            await ctx.editMessageText(
                `✅ ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} updated successfully!`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Edit Another Field', 'back_to_menu')],
                    [Markup.button.callback('🏠 Main Menu', 'goto_main_menu')]
                ])
            );
        } catch (editError) {
            // If editing fails, send a new message
            await ctx.reply(
                `✅ ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} updated successfully!`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Edit Another Field', 'back_to_menu')],
                    [Markup.button.callback('🏠 Main Menu', 'goto_main_menu')]
                ])
            );
        }
        
        ctx.session.editField = null;
        
    } catch (error) {
        console.error(`Error updating ${field}:`, error);
        await ctx.reply(`❌ Error updating ${field}. Please try again.`);
    }
}

const stage = new Scenes.Stage([profileSetupScene, editProfileScene]);
bot.use(session());
bot.use(stage.middleware());

// Commands
// Global error handler for all bot errors
bot.catch(async (err, ctx) => {
    // Handle Telegram 403 Forbidden (bot blocked by user)
    if (err && err.response && err.response.error_code === 403 &&
        err.response.description && err.response.description.includes('bot was blocked by the user')) {
        console.warn(`User ${ctx.from?.id} blocked the bot. Cannot send messages.`);
        return; // Do not attempt to reply
    }
    // Handle other Telegram 403 errors (e.g., user deleted account)
    if (err && err.response && err.response.error_code === 403) {
        console.warn(`Telegram 403 error for user ${ctx.from?.id}: ${err.response.description}`);
        return;
    }
    // Log all other errors and try to reply (if possible)
    console.error('Global bot error:', err);
    try {
        await ctx.reply('❌ An unexpected error occurred. Please try again later.');
    } catch (e) {
        // Ignore further errors (e.g., user blocked the bot)
    }
});
bot.start(async (ctx) => {
    // Track all users who ever started the bot
    await DatabaseOperations.addToAllUsers(ctx.from.id);
    const existingUser = await DatabaseOperations.getUser(ctx.from.id);
    if (existingUser) {
        await ctx.reply(
            '🎉 **Welcome back!**\n\n' +
            '👋 Ready to meet someone new?\n\n' +
            '🔸 Use the menu buttons below to navigate\n' +
            '🔸 Find Match - Connect with someone new\n' +
            '🔸 My Profile - View or edit your profile\n' +
            '🔸 Help - Get assistance',
            { 
                parse_mode: 'Markdown',
                ...createMainMenuKeyboard()
            }
        );
    } else {
        await ctx.reply(
            '🎭 **Welcome to Anonymous Chat!**\n\n' +
            '💕 Meet new people based on your interests and preferences\n' +
            '🔒 Your conversations are completely anonymous\n' +
            '🎯 Our smart matching finds compatible people\n\n' +
            '✨ Let\'s create your profile to get started!',
            { 
                parse_mode: 'Markdown',
                ...Markup.keyboard([
                    ['🚀 Create Profile']
                ]).resize().oneTime()
            }
        );
    }
});

bot.command('profile', async (ctx) => {
    const user = await DatabaseOperations.getUser(ctx.from.id);
    if (!user) {
        await ctx.reply('❌ You need to create a profile first. Use /start to begin!');
        return;
    }

    const profileText = 
        `👤 **Your Profile**\n\n` +
        `🎂 Age: ${user.age}\n` +
        `👤 Gender: ${user.gender}\n` +
        `🎓 Education: ${user.education}\n` +
        `🌍 Languages: ${Array.isArray(user.language) ? user.language.join(', ') : user.language}\n` +
        `💕 Looking for: ${user.preferredGender}\n` +
        `🎯 Interests: ${user.interests.join(', ')}\n\n` +
        `📅 Created: ${new Date(user.createdAt).toLocaleDateString()}`;

    await ctx.reply(profileText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✏️ Edit Profile', 'edit_profile')],
            [Markup.button.callback('🔍 Find Match', 'find_match')]
        ])
    });
});

bot.command('help', async (ctx) => {
    const helpText = 
        '🤖 **Anonymous Chat Bot - Help**\n\n' +
        '**🔹 Main Commands:**\n' +
        '• /start - Welcome message and profile setup\n' +
        '• /find - Find a chat partner\n' +
        '• /menu - Show main menu\n' +
        '• /profile - View or edit your profile\n' +
        '• /end - End current conversation\n' +
        '• /help - Show this help message\n\n' +
        '**🔹 Profile Setup:**\n' +
        '• Create a profile with your interests and preferences\n' +
        '• Smart matching based on compatibility\n' +
        '• Anonymous and secure conversations\n\n' +
        '💡 **Tip:** Complete your profile with genuine interests for better matches!';

    await ctx.reply(helpText, { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🔍 Find Match', 'find_match')],
            [Markup.button.callback('👤 View Profile', 'view_profile')],
            [Markup.button.callback('🏠 Main Menu', 'main_menu')]
        ])
    });
});

bot.command('menu', async (ctx) => {
    try {
        await DatabaseOperations.updateUserActivity(ctx.from.id);
        
        const user = await DatabaseOperations.getUser(ctx.from.id);
        if (!user) {
            await ctx.reply(
                '🎭 **Welcome to Anonymous Chat!**\n\n' +
                '💕 Meet new people based on your interests and preferences\n' +
                '🔒 Your conversations are completely anonymous\n' +
                '🎯 Our smart matching finds compatible people\n\n' +
                '✨ Let\'s create your profile to get started!',
                { 
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🚀 Create Profile', 'create_profile')]
                    ])
                }
            );
            return;
        }

        // Check if user is in an active conversation
        const activeMatch = await DatabaseOperations.getActiveMatch(ctx.from.id);
        
        if (activeMatch) {
            await ctx.reply(
                '💬 **You\'re currently in a conversation!**\n\n' +
                '📝 Keep chatting or end the conversation to access the main menu.',
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🚪 End Current Chat', 'end_chat')],
                        [Markup.button.callback('👤 View Profile', 'view_profile')]
                    ])
                }
            );
        } else {
            await ctx.reply(
                '🏠 **Main Menu**\n\n' +
                '👋 What would you like to do?',
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔍 Find Match', 'find_match')],
                        [Markup.button.callback('👤 View Profile', 'view_profile')],
                        [Markup.button.callback('❓ Help', 'show_help')]
                    ])
                }
            );
        }
    } catch (error) {
        console.error('Error in menu command:', error);
        await ctx.reply('❌ An error occurred. Please try again.');
    }
});

bot.action('show_help', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        
        const helpText = 
            '🤖 **Anonymous Chat Bot - Help**\n\n' +
            '**🔹 Main Commands:**\n' +
            '• /start - Welcome message and profile setup\n' +
            '• /find - Find a chat partner\n' +
            '• /menu - Show main menu\n' +
            '• /profile - View or edit your profile\n' +
            '• /end - End current conversation\n' +
            '• /help - Show this help message\n\n' +
            '**🔹 Profile Setup:**\n' +
            '• Create a profile with your interests and preferences\n' +
            '• Smart matching based on compatibility\n' +
            '• Anonymous and secure conversations\n\n' +
            '💡 **Tip:** Complete your profile with genuine interests for better matches!';

        await ctx.editMessageText(helpText, { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔍 Find Match', 'find_match')],
                [Markup.button.callback('👤 View Profile', 'view_profile')],
                [Markup.button.callback('🏠 Main Menu', 'main_menu')]
            ])
        });
    } catch (error) {
        console.error('Error in show_help action:', error);
        await ctx.answerCbQuery('❌ An error occurred. Please try again.');
    }
});

// Navigation callback actions
bot.action('create_profile', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await ctx.scene.enter('PROFILE_SETUP');
    } catch (error) {
        console.error('Error in create_profile action:', error);
        await ctx.answerCbQuery('❌ An error occurred. Please try again.');
    }
});

bot.action('view_profile', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        
        const user = await DatabaseOperations.getUser(ctx.from.id);
        if (!user) {
            await ctx.editMessageText(
                '❌ You need to create a profile first!',
                Markup.inlineKeyboard([
                    [Markup.button.callback('🆕 Create Profile', 'create_profile')]
                ])
            );
            return;
        }

        const profileText = 
            `👤 **Your Profile**\n\n` +
            `🎂 Age: ${user.age}\n` +
            `👤 Gender: ${user.gender}\n` +
            `🎓 Education: ${user.education}\n` +
            `🌍 Languages: ${Array.isArray(user.language) ? user.language.join(', ') : user.language}\n` +
            `💕 Looking for: ${user.preferredGender}\n` +
            `🎯 Interests: ${user.interests.join(', ')}\n\n` +
            `📅 Created: ${new Date(user.createdAt).toLocaleDateString()}`;

        await ctx.editMessageText(profileText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✏️ Edit Profile', 'edit_profile')],
                [Markup.button.callback('🔍 Find Match', 'find_match')],
                [Markup.button.callback('🏠 Main Menu', 'main_menu')]
            ])
        });
    } catch (error) {
        console.error('Error in view_profile action:', error);
        await ctx.answerCbQuery('❌ An error occurred. Please try again.');
    }
});

bot.action('edit_profile', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await ctx.scene.enter('EDIT_PROFILE');
    } catch (error) {
        console.error('Error in edit_profile action:', error);
        await ctx.answerCbQuery('❌ An error occurred. Please try again.');
    }
});

bot.action('find_match', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        
        const user = await DatabaseOperations.getUser(ctx.from.id);
        if (!user) {
            await ctx.editMessageText(
                '❌ You need to create a profile first!',
                Markup.inlineKeyboard([
                    [Markup.button.callback('🆕 Create Profile', 'create_profile')]
                ])
            );
            return;
        }

        await ctx.editMessageText(
            '🔍 **Starting your search...**\n\n⏳ This will only take a moment...',
            { parse_mode: 'Markdown' }
        );

        const match = await MatchingService.startMatchingProcess(user, ctx);
        if (match) {
            await DatabaseOperations.createMatch(ctx.from.id, match.userId);
            await ctx.editMessageText(
                '🎉 **Instant Match Found!**\n\n✨ You\'ve been connected!',
                { parse_mode: 'Markdown' }
            );
        }
    } catch (error) {
        console.error('Error in find_match action:', error);
        await ctx.answerCbQuery('❌ An error occurred. Please try again.');
    }
});

bot.action('main_menu', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        
        const existingUser = await DatabaseOperations.getUser(ctx.from.id);
        if (existingUser) {
            await ctx.editMessageText(
                '🎉 **Welcome back!**\n\n' +
                '👋 Ready to meet someone new?\n\n' +
                '🔸 /find - Find a new chat partner\n' +
                '🔸 /profile - View or edit your profile\n' +
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
            await ctx.editMessageText(
                '🎭 **Welcome to Anonymous Chat!**\n\n' +
                '💕 Meet new people based on your interests and preferences\n' +
                '🔒 Your conversations are completely anonymous\n' +
                '🎯 Our smart matching finds compatible people\n\n' +
                '✨ Let\'s create your profile to get started!',
                { 
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🚀 Create Profile', 'create_profile')]
                    ])
                }
            );
        }
    } catch (error) {
        console.error('Error in main_menu action:', error);
        await ctx.answerCbQuery('❌ An error occurred. Please try again.');
    }
});

// Find match command
bot.command('find', async (ctx) => {
    try {
        await DatabaseOperations.updateUserActivity(ctx.from.id);
        
        const user = await DatabaseOperations.getUser(ctx.from.id);
        if (!user) {
            await ctx.reply(
                '❌ You need to create a profile first!',
                Markup.keyboard([
                    ['🚀 Create Profile']
                ]).resize().oneTime()
            );
            return;
        }

        if (user.isBanned) {
            await ctx.reply('🚫 Your account has been suspended. Please contact support.');
            return;
        }

        // Check if user is already in a match
        const existingMatch = await DatabaseOperations.getActiveMatch(ctx.from.id);
        if (existingMatch) {
            await ctx.reply(
                '💬 You are already in an active conversation!\n\n🚪 Use "End Chat" button to end it first.',
                createChatKeyboard()
            );
            return;
        }

        // Show searching keyboard and status
        await ctx.reply(
            '🔍 **Starting your search...**\n\n' +
            '⏳ This will only take a moment...',
            {
                parse_mode: 'Markdown',
                ...createSearchingKeyboard()
            }
        );

        // Start the non-blocking matching process
        const match = await MatchingService.startMatchingProcess(user, ctx);
        
        if (match) {
            // Immediate match found
            await DatabaseOperations.removeFromQueue(ctx.from.id);
            await DatabaseOperations.removeFromQueue(match.userId);
            const matchId = await DatabaseOperations.createMatch(ctx.from.id, match.userId);
            console.log(`[DEBUG] /find - Immediate match created: ${matchId}`);
            
            // Notify both users
            await ctx.reply(
                '🎉 **Instant Match Found!**\n\n✨ You\'ve been connected with someone!\n Messages with 👨/👩 are from your chat partner\n📝 Start chatting now!',
                {
                    parse_mode: 'Markdown',
                    ...createChatKeyboard()
                }
            );
            
            await bot.telegram.sendMessage(match.userId, 
                '🎉 **Match Found!**\n\n✨ You\'ve been connected with someone!\n Messages with 👨/👩 are from your chat partner\n📝 Start chatting now!',
                {
                    parse_mode: 'Markdown',
                    ...createChatKeyboard()
                }
            );
        }
        // If no immediate match, user is now in queue and will be notified by background service
        
    } catch (error) {
        console.error('Error in find match:', error);
        await ctx.reply('❌ An error occurred while searching for a match. Please try again.', createMainMenuKeyboard());
    }
});

bot.hears('🔍 Find Match', async (ctx) => {
    try {
        console.log(`[DEBUG] Find Match button pressed by user ${ctx.from.id}`);
        await DatabaseOperations.updateUserActivity(ctx.from.id);
        
        const user = await DatabaseOperations.getUser(ctx.from.id);
        if (!user) {
            await ctx.reply(
                '❌ You need to create a profile first!',
                Markup.keyboard([
                    ['🚀 Create Profile']
                ]).resize().oneTime()
            );
            return;
        }

        if (user.isBanned) {
            await ctx.reply('🚫 Your account has been suspended. Please contact support.');
            return;
        }

        // Check if user is already in a match
        const existingMatch = await DatabaseOperations.getActiveMatch(ctx.from.id);
        console.log(`[DEBUG] Find Match - Existing match check for user ${ctx.from.id}:`, existingMatch);
        
        if (existingMatch) {
            console.log(`[DEBUG] Find Match - User ${ctx.from.id} already has active match ${existingMatch.id}`);
            await ctx.reply(
                '💬 You are already in an active conversation!\n\n🚪 Use "End Chat" button to end it first.',
                createChatKeyboard()
            );
            return;
        }

        // Show searching keyboard and status
        await ctx.reply(
            '🔍 **Starting your search...**\n\n' +
            '⏳ This will only take a moment...',
            {
                parse_mode: 'Markdown',
                ...createSearchingKeyboard()
            }
        );

        // Start the non-blocking matching process
        const match = await MatchingService.startMatchingProcess(user, ctx);
        
        if (match) {
            console.log(`[DEBUG] Button - Match found! User ${ctx.from.id} matched with ${match.userId}`);
            // Immediate match found
            await DatabaseOperations.removeFromQueue(ctx.from.id);
            await DatabaseOperations.removeFromQueue(match.userId);
            const matchId = await DatabaseOperations.createMatch(ctx.from.id, match.userId);
            console.log(`[DEBUG] Button - Match created with ID: ${matchId}`);
            
            // Notify both users
            await ctx.reply(
                '🎉 **Instant Match Found!**\n\n✨ You\'ve been connected with someone!\n Messages with 👨/👩 are from your chat partner\n📝 Start chatting now!',
                {
                    parse_mode: 'Markdown',
                    ...createChatKeyboard()
                }
            );
            
            await bot.telegram.sendMessage(match.userId, 
                '🎉 **Match Found!**\n\n✨ You\'ve been connected with someone!\n Messages with 👨/👩 are from your chat partner\n📝 Start chatting now!',
                {
                    parse_mode: 'Markdown',
                    ...createChatKeyboard()
                }
            );
        }
        // If no immediate match, user is now in queue and will be notified by background service
        
    } catch (error) {
        console.error('Error in find match:', error);
        await ctx.reply('❌ An error occurred while searching for a match. Please try again.', createMainMenuKeyboard());
    }
});

bot.hears('👤 My Profile', async (ctx) => {
    try {
        await DatabaseOperations.updateUserActivity(ctx.from.id);
        
        const user = await DatabaseOperations.getUser(ctx.from.id);
        if (!user) {
            await ctx.reply(
                '❌ You need to create a profile first!',
                Markup.keyboard([
                    ['🚀 Create Profile']
                ]).resize().oneTime()
            );
            return;
        }

        const profileText = 
            `👤 **Your Profile**\n\n` +
            `🎂 Age: ${user.age}\n` +
            `👤 Gender: ${user.gender}\n` +
            `🎓 Education: ${user.education}\n` +
            `🌍 Languages: ${Array.isArray(user.language) ? user.language.join(', ') : user.language}\n` +
            `💕 Looking for: ${user.preferredGender}\n` +
            `🎯 Interests: ${user.interests.join(', ')}\n\n` +
            `📅 Created: ${new Date(user.createdAt).toLocaleDateString()}`;

        await ctx.reply(profileText, {
            parse_mode: 'Markdown',
            ...createProfileKeyboard()
        });
    } catch (error) {
        console.error('Error showing profile:', error);
        await ctx.reply('❌ An error occurred. Please try again.', createMainMenuKeyboard());
    }
});

bot.hears('✏️ Edit Profile', async (ctx) => {
    try {
        await ctx.scene.enter('EDIT_PROFILE');
    } catch (error) {
        console.error('Error in edit profile:', error);
        await ctx.reply('❌ An error occurred. Please try again.', createMainMenuKeyboard());
    }
});

bot.hears('🚀 Create Profile', async (ctx) => {
    try {
        await ctx.scene.enter('PROFILE_SETUP');
    } catch (error) {
        console.error('Error in create profile:', error);
        await ctx.reply('❌ An error occurred. Please try again.');
    }
});

bot.hears('🚪 End Chat', async (ctx) => {
    try {
        console.log(`[DEBUG] End Chat button pressed by user ${ctx.from.id}`);
        await DatabaseOperations.updateUserActivity(ctx.from.id);
        
        const match = await DatabaseOperations.getActiveMatch(ctx.from.id);
        console.log(`[DEBUG] Active match found:`, match);
        
        if (!match) {
            console.log(`[DEBUG] No active match found for user ${ctx.from.id}`);
            await ctx.reply(
                '❌ You are not currently in a conversation.',
                createMainMenuKeyboard()
            );
            return;
        }

        // End the match
        console.log(`[DEBUG] Ending match ${match.id}`);
        await DatabaseOperations.endMatch(match.id);
        
        // Find the other user
        const otherUserId = match.participants.find(id => id !== ctx.from.id);
        console.log(`[DEBUG] Other user ID: ${otherUserId}`);
        
        // Return to main menu for both users
        await ctx.reply(
            '👋 **Conversation ended**\n\nThanks for chatting! You can find a new match anytime.',
            {
                parse_mode: 'Markdown',
                ...createMainMenuKeyboard()
            }
        );
        
        if (otherUserId) {
            try {
                await bot.telegram.sendMessage(otherUserId, 
                    '👋 **Conversation ended**\n\nYour chat partner has left. You can find a new match anytime.',
                    {
                        parse_mode: 'Markdown',
                        ...createMainMenuKeyboard()
                    }
                );
                console.log(`[DEBUG] Notified other user ${otherUserId} about chat end`);
            } catch (notifyError) {
                console.log(`[DEBUG] Could not notify other user ${otherUserId}:`, notifyError.message);
            }
        }
        
    } catch (error) {
        console.error('Error ending chat:', error);
        await ctx.reply('❌ An error occurred. Please try again.', createMainMenuKeyboard());
    }
});

bot.hears('❌ Cancel Search', async (ctx) => {
    try {
        await DatabaseOperations.removeFromQueue(ctx.from.id);
        
        await ctx.reply(
            '❌ **Search cancelled**\n\nYou can start a new search anytime.',
            {
                parse_mode: 'Markdown',
                ...createMainMenuKeyboard()
            }
        );
    } catch (error) {
        console.error('Error cancelling search:', error);
        await ctx.reply('❌ An error occurred. Please try again.', createMainMenuKeyboard());
    }
});

bot.hears('❓ Help', async (ctx) => {
    const helpText = 
        '🤖 **Anonymous Chat Bot - Help**\n\n' +
        '**🔹 Navigation:**\n' +
        '• 🔍 Find Match - Connect with someone new\n' +
        '• 👤 My Profile - View or edit your profile\n' +
        '• ✏️ Edit Profile - Modify your information\n' +
        '• 🚪 End Chat - Leave current conversation\n' +
        '• ❌ Cancel Search - Stop looking for match\n\n' +
        '**🔹 Features:**\n' +
        '• Smart matching based on interests and preferences\n' +
        '• Anonymous and secure conversations\n' +
        '• Gender indicators (👨/👩) for messages\n\n' +
        '💡 **Tip:** Complete your profile with genuine interests for better matches!';

    await ctx.reply(helpText, { 
        parse_mode: 'Markdown',
        ...createMainMenuKeyboard()
    });
});

bot.hears('📊 Menu', async (ctx) => {
    try {
        await DatabaseOperations.updateUserActivity(ctx.from.id);
        
        const user = await DatabaseOperations.getUser(ctx.from.id);
        if (!user) {
            await ctx.reply(
                '🎭 **Welcome to Anonymous Chat!**\n\n' +
                '💕 Meet new people based on your interests and preferences\n' +
                '🔒 Your conversations are completely anonymous\n' +
                '🎯 Our smart matching finds compatible people\n\n' +
                '✨ Let\'s create your profile to get started!',
                { 
                    parse_mode: 'Markdown',
                    ...Markup.keyboard([
                        ['🚀 Create Profile']
                    ]).resize().oneTime()
                }
            );
            return;
        }

        // Check if user is in an active conversation
        const activeMatch = await DatabaseOperations.getActiveMatch(ctx.from.id);
        
        if (activeMatch) {
            await ctx.reply(
                '💬 **You\'re currently in a conversation!**\n\n' +
                '📝 Keep chatting or end the conversation to access the main menu.',
                {
                    parse_mode: 'Markdown',
                    ...createChatKeyboard()
                }
            );
        } else {
            await ctx.reply(
                '🏠 **Main Menu**\n\n' +
                '👋 What would you like to do?',
                {
                    parse_mode: 'Markdown',
                    ...createMainMenuKeyboard()
                }
            );
        }
    } catch (error) {
        console.error('Error in menu:', error);
        await ctx.reply('❌ An error occurred. Please try again.', createMainMenuKeyboard());
    }
});

// Admin Commands (must be before message handlers)
// Admin totalUser command
bot.command('totalUser', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await ctx.reply('❌ Access denied. Admin only.');
        return;
    }
    try {
        const count = await DatabaseOperations.getAllUserCount();
        await ctx.reply(`👥 Total users who ever joined: ${count}`);
    } catch (error) {
        await ctx.reply('❌ Failed to get total user count.');
    }
});
function isAdmin(userId) {
    return ADMIN_CHAT_ID && userId.toString() === ADMIN_CHAT_ID.toString();
}

// List all users command
bot.command('listusers', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        console.log(`[ADMIN] ${ctx.from.id} requested user list`);

        let users = [];
        if (db) {
            users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();
        } else if (redisClient) {
            const keys = await redisClient.keys('user:*');
            for (const key of keys) {
                const userData = await redisClient.get(key);
                if (userData) users.push(JSON.parse(userData));
            }
        } else {
            users = Array.from(memoryUsers.values());
        }

        if (users.length === 0) {
            await ctx.reply('📊 **User List**\n\n❌ No users found.');
            return;
        }

        // Split users into chunks of 10 for readability
        const chunkSize = 10;
        for (let i = 0; i < users.length; i += chunkSize) {
            const chunk = users.slice(i, i + chunkSize);
            
            let userList = `📊 **User List** (${i + 1}-${Math.min(i + chunkSize, users.length)} of ${users.length})\n\n`;
            
            chunk.forEach((user, index) => {
                const status = user.isBanned ? '🚫 BANNED' : (user.isActive ? '✅ Active' : '⏸️ Inactive');
                const joinDate = new Date(user.createdAt).toLocaleDateString();
                
                userList += `**${i + index + 1}.** ${user.firstName || 'Unknown'}\n`;
                userList += `   👤 ID: \`${user.userId}\`\n`;
                userList += `   📱 Username: ${user.username ? '@' + user.username : 'None'}\n`;
                userList += `   🎂 Age: ${user.age} | ${user.gender}\n`;
                userList += `   📅 Joined: ${joinDate}\n`;
                userList += `   ${status}\n\n`;
            });

            await ctx.reply(userList, { parse_mode: 'Markdown' });
            
            // Add small delay between chunks to avoid flooding
            if (i + chunkSize < users.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        await ctx.reply(
            `📋 **Usage Instructions:**\n\n` +
            `• Copy user ID from list above\n` +
            `• Ban user: \`/ban USER_ID reason\`\n` +
            `• Unban user: \`/unban USER_ID\`\n` +
            `• View user details: \`/user USER_ID\`\n\n` +
            `💡 **Quick Commands:**\n` +
            `• \`/listbanned\` - Show banned users\n` +
            `• \`/stats\` - Bot statistics\n` +
            `• \`/broadcast\` - Send message to all users`,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        console.error('Error in listusers command:', error);
        await ctx.reply('❌ An error occurred while fetching user list.');
    }
});

// List banned users command
bot.command('listbanned', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        console.log(`[ADMIN] ${ctx.from.id} requested banned users list`);

        let bannedUsers = [];
        if (db) {
            bannedUsers = await db.collection('users').find({ isBanned: true }).sort({ createdAt: -1 }).toArray();
        } else if (redisClient) {
            const keys = await redisClient.keys('user:*');
            for (const key of keys) {
                const userData = await redisClient.get(key);
                if (userData) {
                    const user = JSON.parse(userData);
                    if (user.isBanned) bannedUsers.push(user);
                }
            }
        } else {
            bannedUsers = Array.from(memoryUsers.values()).filter(user => user.isBanned);
        }

        if (bannedUsers.length === 0) {
            await ctx.reply('🚫 **Banned Users**\n\n✅ No banned users found.');
            return;
        }

        let bannedList = `🚫 **Banned Users** (${bannedUsers.length} total)\n\n`;
        
        bannedUsers.forEach((user, index) => {
            const bannedDate = user.bannedAt ? new Date(user.bannedAt).toLocaleDateString() : 'Unknown';
            
            bannedList += `**${index + 1}.** ${user.firstName || 'Unknown'}\n`;
            bannedList += `   👤 ID: \`${user.userId}\`\n`;
            bannedList += `   📱 Username: ${user.username ? '@' + user.username : 'None'}\n`;
            bannedList += `   🎂 Age: ${user.age} | ${user.gender}\n`;
            bannedList += `   🚫 Banned: ${bannedDate}\n`;
            if (user.banReason) {
                bannedList += `   📝 Reason: ${user.banReason}\n`;
            }
            bannedList += `\n`;
        });

        await ctx.reply(bannedList, { parse_mode: 'Markdown' });

        await ctx.reply(
            `🔧 **Unban Instructions:**\n\n` +
            `• Copy user ID from list above\n` +
            `• Unban: \`/unban USER_ID\`\n\n` +
            `💡 Example: \`/unban 123456789\``,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        console.error('Error in listbanned command:', error);
        await ctx.reply('❌ An error occurred while fetching banned users list.');
    }
});

// Enhanced admin command with user management menu
bot.command('admin', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        const adminMenu = 
            '👨‍💼 **Admin Panel**\n\n' +
            '**👥 User Management:**\n' +
            '• `/listusers` - List all users with IDs\n' +
            '• `/listbanned` - List banned users\n' +
            '• `/appeals` - List pending appeals\n' +
            '• `/user USER_ID` - View user details\n' +
            '• `/ban USER_ID reason` - Ban a user\n' +
            '• `/unban USER_ID` - Unban a user\n\n' +
            '**⚖️ Appeal Management:**\n' +
            '• `/approve USER_ID` - Approve ban appeal\n' +
            '• `/deny USER_ID reason` - Deny ban appeal\n\n' +
            '**📊 Statistics:**\n' +
            '• `/stats` - Bot statistics\n\n' +
            '**📢 Communication:**\n' +
            '• `/broadcast message` - Send to all users\n\n' +
            '💡 **Pro Tips:**\n' +
            '• Use `/listusers` to see user IDs\n' +
            '• Check `/appeals` for pending reviews\n' +
            '• Copy-paste IDs for quick actions';

        await ctx.reply(adminMenu, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error in admin command:', error);
        await ctx.reply('❌ An error occurred.');
    }
});

// Enhanced user details command
bot.command('user', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            await ctx.reply('❌ Usage: `/user USER_ID`\n\n💡 Get user IDs from `/listusers`');
            return;
        }

        const targetUserId = parseInt(args[1]);
        if (isNaN(targetUserId)) {
            await ctx.reply('❌ Invalid user ID. Must be a number.');
            return;
        }

        const user = await DatabaseOperations.getUser(targetUserId);
        if (!user) {
            await ctx.reply(`❌ User ${targetUserId} not found.`);
            return;
        }

        // Check if user is in active match
        const activeMatch = await DatabaseOperations.getActiveMatch(targetUserId);
        
        const userDetails = 
            `👤 **User Details**\n\n` +
            `**Basic Info:**\n` +
            `• Name: ${user.firstName}\n` +
            `• ID: \`${user.userId}\`\n` +
            `• Username: ${user.username ? '@' + user.username : 'None'}\n` +
            `• Age: ${user.age}\n` +
            `• Gender: ${user.gender}\n` +
            `• Education: ${user.education}\n` +
            `• Languages: ${Array.isArray(user.language) ? user.language.join(', ') : user.language}\n\n` +
            `**Preferences:**\n` +
            `• Looking for: ${user.preferredGender}\n` +
            `• Interests: ${user.interests.join(', ')}\n\n` +
            `**Status:**\n` +
            `• Account: ${user.isBanned ? '🚫 Banned' : '✅ Active'}\n` +
            `• Currently: ${activeMatch ? '💬 In chat' : '🏠 Available'}\n` +
            `• Joined: ${new Date(user.createdAt).toLocaleDateString()}\n` +
            `• Last active: ${new Date(user.lastActive).toLocaleDateString()}\n\n` +
            `**Actions:**\n` +
            `• Ban: \`/ban ${user.userId} reason\`\n` +
            `• ${user.isBanned ? 'Unban: `/unban ' + user.userId + '`' : 'User is not banned'}`;

        await ctx.reply(userDetails, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error in user command:', error);
        await ctx.reply('❌ An error occurred while fetching user details.');
    }
});

// Enhanced ban command with reason tracking
bot.command('ban', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 3) {
            await ctx.reply(
                '❌ Usage: `/ban USER_ID reason`\n\n' +
                '💡 Examples:\n' +
                '• `/ban 123456789 inappropriate behavior`\n' +
                '• `/ban 987654321 spam messages`\n\n' +
                '📋 Get user IDs from `/listusers`'
            );
            return;
        }

        const targetUserId = parseInt(args[1]);
        const reason = args.slice(2).join(' ');

        if (isNaN(targetUserId)) {
            await ctx.reply('❌ Invalid user ID. Must be a number.');
            return;
        }

        const user = await DatabaseOperations.getUser(targetUserId);
        if (!user) {
            await ctx.reply(`❌ User ${targetUserId} not found.`);
            return;
        }

        if (user.isBanned) {
            await ctx.reply(`⚠️ User ${user.firstName} (${targetUserId}) is already banned.`);
            return;
        }

        // Update user ban status
        const updatedProfile = {
            ...user,
            isBanned: true,
            bannedAt: new Date(),
            banReason: reason,
            bannedBy: ctx.from.id
        };

        await DatabaseOperations.saveUser(updatedProfile);

        // End any active matches
        const activeMatch = await DatabaseOperations.getActiveMatch(targetUserId);
        if (activeMatch) {
            await DatabaseOperations.endMatch(activeMatch.id);
        }

        console.log(`[ADMIN] User ${targetUserId} banned by ${ctx.from.id}. Reason: ${reason}`);

        await ctx.reply(
            `✅ **User Banned Successfully**\n\n` +
            `👤 User: ${user.firstName} (${targetUserId})\n` +
            `📝 Reason: ${reason}\n` +
            `🕐 Time: ${new Date().toLocaleString()}\n\n` +
            `💡 To unban: \`/unban ${targetUserId}\``,
            { parse_mode: 'Markdown' }
        );

        // Notify the banned user
        try {
            await bot.telegram.sendMessage(
                targetUserId,
                `🚫 **Account Suspended**\n\n` +
                `Your account has been suspended by an administrator.\n\n` +
                `📝 Reason: ${reason}\n\n` +
                `📞 Contact support if you believe this is an error.`,
                { parse_mode: 'Markdown' }
            );
        } catch (notifyError) {
            console.log(`Could not notify banned user ${targetUserId}:`, notifyError.message);
        }

    } catch (error) {
        console.error('Error in ban command:', error);
        await ctx.reply('❌ An error occurred while banning user.');
    }
});

// Enhanced unban command
bot.command('unban', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            await ctx.reply(
                '❌ Usage: `/unban USER_ID`\n\n' +
                '💡 Examples:\n' +
                '• `/unban 123456789`\n\n' +
                '📋 Get banned user IDs from `/listbanned`'
            );
            return;
        }

        const targetUserId = parseInt(args[1]);
        if (isNaN(targetUserId)) {
            await ctx.reply('❌ Invalid user ID. Must be a number.');
            return;
        }

        const user = await DatabaseOperations.getUser(targetUserId);
        if (!user) {
            await ctx.reply(`❌ User ${targetUserId} not found.`);
            return;
        }

        if (!user.isBanned) {
            await ctx.reply(`⚠️ User ${user.firstName} (${targetUserId}) is not banned.`);
            return;
        }

        // Update user unban status
        const updatedProfile = {
            ...user,
            isBanned: false,
            unbannedAt: new Date(),
            unbannedBy: ctx.from.id,
            // Keep ban history
            lastBanReason: user.banReason,
            lastBannedAt: user.bannedAt
        };

        // Remove current ban fields
        delete updatedProfile.banReason;
        delete updatedProfile.bannedAt;
        delete updatedProfile.bannedBy;

        await DatabaseOperations.saveUser(updatedProfile);

        console.log(`[ADMIN] User ${targetUserId} unbanned by ${ctx.from.id}`);

        await ctx.reply(
            `✅ **User Unbanned Successfully**\n\n` +
            `👤 User: ${user.firstName} (${targetUserId})\n` +
            `🕐 Time: ${new Date().toLocaleString()}\n\n` +
            `💡 User can now use the bot normally.`,
            { parse_mode: 'Markdown' }
        );

        // Notify the unbanned user
        try {
            await bot.telegram.sendMessage(
                targetUserId,
                `✅ **Account Restored**\n\n` +
                `Your account has been restored by an administrator.\n\n` +
                `🎉 You can now use the bot normally!\n` +
                `💡 Use /start to begin.`,
                { parse_mode: 'Markdown' }
            );
        } catch (notifyError) {
            console.log(`Could not notify unbanned user ${targetUserId}:`, notifyError.message);
        }

    } catch (error) {
        console.error('Error in unban command:', error);
        await ctx.reply('❌ An error occurred while unbanning user.');
    }
});

// Enhanced stats command
bot.command('stats', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        let totalUsers = 0;
        let activeUsers = 0;
        let bannedUsers = 0;
        let totalMatches = 0;
        let activeMatches = 0;

        if (db) {
            totalUsers = await db.collection('users').countDocuments();
            activeUsers = await db.collection('users').countDocuments({ isBanned: false });
            bannedUsers = await db.collection('users').countDocuments({ isBanned: true });
            totalMatches = await db.collection('matches').countDocuments();
            activeMatches = await db.collection('matches').countDocuments({ isActive: true });
        } else if (redisClient) {
            const userKeys = await redisClient.keys('user:*');
            totalUsers = userKeys.length;
            for (const key of userKeys) {
                const userData = await redisClient.get(key);
                if (userData) {
                    const user = JSON.parse(userData);
                    if (user.isBanned) bannedUsers++;
                    else activeUsers++;
                }
            }
            const matchKeys = await redisClient.keys('match:*');
            totalMatches = matchKeys.length;
            for (const key of matchKeys) {
                const matchData = await redisClient.get(key);
                if (matchData) {
                    const match = JSON.parse(matchData);
                    if (match.isActive) activeMatches++;
                }
            }
        } else {
            totalUsers = memoryUsers.size;
            Array.from(memoryUsers.values()).forEach(user => {
                if (user.isBanned) bannedUsers++;
                else activeUsers++;
            });
            totalMatches = memoryMatches.size;
            Array.from(memoryMatches.values()).forEach(match => {
                if (match && match.isActive) activeMatches++;
            });
        }

        const stats = 
            `📊 **Bot Statistics**\n\n` +
            `**👥 Users:**\n` +
            `• Total Users: ${totalUsers}\n` +
            `• Active Users: ${activeUsers}\n` +
            `• Banned Users: ${bannedUsers}\n\n` +
            `**💬 Matches:**\n` +
            `• Total Matches: ${totalMatches}\n` +
            `• Active Chats: ${activeMatches}\n\n` +
            `**🏥 System:**\n` +
            `• Database: ${db ? 'MongoDB' : redisClient ? 'Redis' : 'Memory'}\n` +
            `• Uptime: ${process.uptime().toFixed(0)}s\n` +
            `• Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n\n` +
            `📅 Generated: ${new Date().toLocaleString()}`;

        await ctx.reply(stats, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error in stats command:', error);
        await ctx.reply('❌ An error occurred while fetching statistics.');
    }
});

// Enhanced broadcast command
bot.command('broadcast', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            await ctx.reply(
                '❌ Usage: `/broadcast message`\n\n' +
                '💡 Example:\n' +
                '`/broadcast 🎉 Bot maintenance completed! New features added.`\n\n' +
                '⚠️ This will send the message to ALL users!'
            );
            return;
        }

        const message = args.slice(1).join(' ');
        
        let users = [];
        if (db) {
            users = await db.collection('users').find({ isBanned: false }).toArray();
        } else if (redisClient) {
            const keys = await redisClient.keys('user:*');
            for (const key of keys) {
                const userData = await redisClient.get(key);
                if (userData) {
                    const user = JSON.parse(userData);
                    if (!user.isBanned) users.push(user);
                }
            }
        } else {
            users = Array.from(memoryUsers.values()).filter(user => !user.isBanned);
        }

        if (users.length === 0) {
            await ctx.reply('❌ No active users found to broadcast to.');
            return;
        }

        await ctx.reply(
            `📢 **Broadcasting Message**\n\n` +
            `👥 Target: ${users.length} active users\n` +
            `📝 Message: ${message}\n\n` +
            `⏳ Starting broadcast...`
        );

        let sent = 0;
        let failed = 0;

        for (const user of users) {
            try {
                await bot.telegram.sendMessage(
                    user.userId,
                    `📢 **Admin Message**\n\n${message}`,
                    { parse_mode: 'Markdown' }
                );
                sent++;
                
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                failed++;
                console.log(`Failed to send broadcast to ${user.userId}:`, error.message);
            }
        }

        await ctx.reply(
            `✅ **Broadcast Complete**\n\n` +
            `📤 Sent: ${sent}\n` +
            `❌ Failed: ${failed}\n` +
            `👥 Total: ${users.length}\n\n` +
            `📅 Completed: ${new Date().toLocaleString()}`
        );

        console.log(`[ADMIN] Broadcast sent by ${ctx.from.id}. Sent: ${sent}, Failed: ${failed}`);

    } catch (error) {
        console.error('Error in broadcast command:', error);
        await ctx.reply('❌ An error occurred while broadcasting message.');
    }
});

// Admin Appeal Management Commands
bot.command('appeals', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        let appeals = [];
        if (db) {
            appeals = await db.collection('users').find({ 
                isBanned: true, 
                appealStatus: { $exists: true } 
            }).sort({ appealedAt: -1 }).toArray();
        } else if (redisClient) {
            const keys = await redisClient.keys('user:*');
            for (const key of keys) {
                const userData = await redisClient.get(key);
                if (userData) {
                    const user = JSON.parse(userData);
                    if (user.isBanned && user.appealStatus) appeals.push(user);
                }
            }
        } else {
            appeals = Array.from(memoryUsers.values()).filter(user => 
                user.isBanned && user.appealStatus
            );
        }

        if (appeals.length === 0) {
            await ctx.reply('📋 **Appeals List**\n\n❌ No appeals found.');
            return;
        }

        const pendingAppeals = appeals.filter(user => user.appealStatus === 'pending');
        
        let message = `📋 **Appeals Overview**\n\n📊 Total: ${appeals.length} | ⏳ Pending: ${pendingAppeals.length}\n\n`;
        
        if (pendingAppeals.length > 0) {
            message += `⏳ **PENDING APPEALS**\n\n`;
            pendingAppeals.slice(0, 3).forEach((user, index) => {
                message += `**${index + 1}.** ${user.firstName} (\`${user.userId}\`)\n`;
                message += `   💬 "${user.appealText.substring(0, 80)}..."\n`;
                message += `   📅 ${new Date(user.appealedAt).toLocaleDateString()}\n\n`;
            });
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error in appeals command:', error);
        await ctx.reply('❌ An error occurred while fetching appeals.');
    }
});

bot.command('approve', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            await ctx.reply('❌ Usage: `/approve USER_ID`\n💡 Get user IDs from `/appeals`');
            return;
        }

        const targetUserId = parseInt(args[1]);
        const user = await DatabaseOperations.getUser(targetUserId);
        
        if (!user || !user.isBanned || user.appealStatus !== 'pending') {
            await ctx.reply('❌ User not found or no pending appeal.');
            return;
        }

        const updatedProfile = {
            ...user,
            isBanned: false,
            appealStatus: 'approved',
            appealReviewedBy: ctx.from.id,
            appealReviewedAt: new Date(),
            unbannedAt: new Date(),
            unbannedBy: ctx.from.id
        };

        await DatabaseOperations.saveUser(updatedProfile);

        await ctx.reply(
            `✅ **Appeal Approved**\n\n👤 User: ${user.firstName} (${targetUserId})\n💬 Appeal: "${user.appealText}"\n✅ Account restored`,
            { parse_mode: 'Markdown' }
        );

        try {
            await bot.telegram.sendMessage(
                targetUserId,
                `✅ **Appeal Approved!**\n\n🎉 Your ban appeal has been approved!\n💬 Your appeal: "${user.appealText}"\n\n🎊 Welcome back! Use /start to begin.`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.log(`Could not notify user ${targetUserId}:`, error.message);
        }

    } catch (error) {
        console.error('Error in approve command:', error);
        await ctx.reply('❌ An error occurred while approving appeal.');
    }
});

bot.command('deny', async (ctx) => {
    try {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Access denied. Admin only.');
            return;
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 3) {
            await ctx.reply('❌ Usage: `/deny USER_ID reason`\n💡 Example: `/deny 123456789 Insufficient justification`');
            return;
        }

        const targetUserId = parseInt(args[1]);
        const denyReason = args.slice(2).join(' ');
        const user = await DatabaseOperations.getUser(targetUserId);
        
        if (!user || !user.isBanned || user.appealStatus !== 'pending') {
            await ctx.reply('❌ User not found or no pending appeal.');
            return;
        }

        const updatedProfile = {
            ...user,
            appealStatus: 'denied',
            appealReviewedBy: ctx.from.id,
            appealReviewedAt: new Date(),
            appealDenyReason: denyReason
        };

        await DatabaseOperations.saveUser(updatedProfile);

        await ctx.reply(
            `❌ **Appeal Denied**\n\n👤 User: ${user.firstName} (${targetUserId})\n💬 Appeal: "${user.appealText}"\n❌ Reason: ${denyReason}`,
            { parse_mode: 'Markdown' }
        );

        try {
            await bot.telegram.sendMessage(
                targetUserId,
                `❌ **Appeal Denied**\n\n😔 Your ban appeal has been denied.\n💬 Your appeal: "${user.appealText}"\n❌ Reason: ${denyReason}\n\n🔄 You can submit a new appeal after 7 days.`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.log(`Could not notify user ${targetUserId}:`, error.message);
        }

    } catch (error) {
        console.error('Error in deny command:', error);
        await ctx.reply('❌ An error occurred while denying appeal.');
    }
});

// Appeal System Commands
bot.command('appeal', async (ctx) => {
    try {
        const user = await DatabaseOperations.getUser(ctx.from.id);
        if (!user) {
            await ctx.reply('❌ You need to create a profile first. Use /start to begin!');
            return;
        }

        if (!user.isBanned) {
            await ctx.reply('❌ Your account is not banned. You don\'t need to appeal.');
            return;
        }

        if (user.appealStatus === 'pending') {
            await ctx.reply(
                '⏳ **Appeal Already Submitted**\n\n' +
                'You already have a pending appeal. Please wait for admin review.\n\n' +
                `📝 Your appeal: "${user.appealText}"\n` +
                `📅 Submitted: ${new Date(user.appealedAt).toLocaleString()}`
            );
            return;
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            await ctx.reply(
                '📝 **Submit Ban Appeal**\n\n' +
                '❌ Usage: `/appeal your reason here`\n\n' +
                '💡 Example:\n' +
                '`/appeal I was banned by mistake. I was not spamming.`\n\n' +
                '📋 **Tips:**\n' +
                '• Be honest and respectful\n' +
                '• Explain what happened\n' +
                '• Keep it concise but detailed'
            );
            return;
        }

        const appealText = args.slice(1).join(' ');
        
        if (appealText.length < 10) {
            await ctx.reply('❌ Your appeal is too short. Please provide more details.');
            return;
        }

        const updatedProfile = {
            ...user,
            appealText: appealText,
            appealedAt: new Date(),
            appealStatus: 'pending'
        };

        await DatabaseOperations.saveUser(updatedProfile);

        await ctx.reply(
            '✅ **Appeal Submitted Successfully**\n\n' +
            '📝 Your appeal has been sent to admins for review.\n\n' +
            `📋 Appeal: "${appealText}"\n` +
            `📅 Submitted: ${new Date().toLocaleString()}\n\n` +
            '⏳ You\'ll be notified of the decision within 24-48 hours.'
        );

        if (ADMIN_CHAT_ID) {
            try {
                await bot.telegram.sendMessage(
                    ADMIN_CHAT_ID,
                    `🔔 **New Ban Appeal**\n\n` +
                    `👤 User: ${user.firstName} (${user.userId})\n` +
                    `💬 Appeal: "${appealText}"\n\n` +
                    `⚡ Actions: \`/approve ${user.userId}\` or \`/deny ${user.userId} reason\``,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.log('Could not notify admin:', error.message);
            }
        }

    } catch (error) {
        console.error('Error in appeal command:', error);
        await ctx.reply('❌ An error occurred while submitting your appeal.');
    }
});

// Message relaying for active matches
bot.on('text', async (ctx) => {
    try {
        // Skip if it's a command or keyboard button
        if (ctx.message.text.startsWith('/') || 
            ['🔍 Find Match', '👤 My Profile', '✏️ Edit Profile', '🚀 Create Profile', 
             '🚪 End Chat', '❌ Cancel Search', '❓ Help', '📊 Menu'].includes(ctx.message.text)) {
            return;
        }
        
        await DatabaseOperations.updateUserActivity(ctx.from.id);
        
        const match = await DatabaseOperations.getActiveMatch(ctx.from.id);
        if (!match) {
            await ctx.reply(
                '💡 **You\'re not in a conversation yet!**\n\n🔍 Use the buttons below to get started',
                {
                    parse_mode: 'Markdown',
                    ...createMainMenuKeyboard()
                }
            );
            return;
        }
        
        // Find the other user
        const otherUserId = match.participants.find(id => id !== ctx.from.id);
        if (!otherUserId) return;
        
        // Get sender's user data for gender emoji
        const senderUser = await DatabaseOperations.getUser(ctx.from.id);
        const genderEmoji = senderUser?.gender === 'Male' ? '👨' : '👩';
        
        // Filter inappropriate content
        let messageText = ctx.message.text;
        if (filter.isProfane(messageText)) {
            await ctx.reply('⚠️ Your message contains inappropriate content and was not sent.');
            return;
        }
        
        // Relay the message with gender-specific chat indicator
        await bot.telegram.sendMessage(otherUserId, `${genderEmoji} ${messageText}`);
        
    } catch (error) {
        console.error('Error relaying message:', error);
        await ctx.reply('❌ Failed to send message. Please try again.');
    }
});

// Handle other message types (photos, videos, etc.)
bot.on(['photo', 'video', 'document', 'audio', 'voice', 'sticker'], async (ctx) => {
    try {
        await DatabaseOperations.updateUserActivity(ctx.from.id);
        
        const match = await DatabaseOperations.getActiveMatch(ctx.from.id);
        if (!match) {
            await ctx.reply(
                '💡 **You\'re not in a conversation yet!**\n\n🔍 Use the buttons below to get started',
                {
                    parse_mode: 'Markdown',
                    ...createMainMenuKeyboard()
                }
            );
            return;
        }
        
        // Find the other user
        const otherUserId = match.participants.find(id => id !== ctx.from.id);
        if (!otherUserId) return;
        
        // Get sender's user data for gender emoji
        const senderUser = await DatabaseOperations.getUser(ctx.from.id);
        const genderEmoji = senderUser?.gender === 'Male' ? '👨' : '👩';
        
        // Send media type indicator first, then forward the message
        const messageType = ctx.message.photo ? '📸 Photo' : 
                           ctx.message.video ? '🎥 Video' : 
                           ctx.message.document ? '📄 Document' : 
                           ctx.message.audio ? '🎵 Audio' : 
                           ctx.message.voice ? '🎤 Voice message' : 
                           ctx.message.sticker ? '😄 Sticker' : '📎 Media';
        
        await bot.telegram.sendMessage(otherUserId, `${genderEmoji} ${messageType}`);
        await ctx.forwardMessage(otherUserId);
        
    } catch (error) {
        console.error('Error relaying media:', error);
        await ctx.reply('❌ Failed to send media. Please try again.');
    }
});

// Start the bot
async function startBot() {
    try {
        console.log('🚀 Starting Telegram Anonymous Chat Bot...');
        await initDatabase();
        
        // Start the background matching service
        MatchingService.runBackgroundMatchingService();
        console.log('🔄 Background matching service started');
        
        await bot.launch();
        console.log('✅ Bot started successfully');
        console.log('🎭 Anonymous Chat Bot is now running...');
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

startBot();
