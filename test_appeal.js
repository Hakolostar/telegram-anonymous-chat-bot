// Test Appeal System
require('dotenv').config();

const { MongoClient } = require('mongodb');

async function testAppealSystem() {
    try {
        console.log('🧪 Testing Appeal System...');
        
        // Connect to MongoDB
        const client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        const db = client.db('anonymous_chat_bot');
        
        // Test 1: Find banned users
        const bannedUsers = await db.collection('users').find({ isBanned: true }).toArray();
        console.log(`📊 Found ${bannedUsers.length} banned users`);
        
        // Test 2: Find users with appeals
        const usersWithAppeals = await db.collection('users').find({ 
            appealStatus: { $exists: true } 
        }).toArray();
        console.log(`📋 Found ${usersWithAppeals.length} users with appeals`);
        
        // Test 3: Find pending appeals
        const pendingAppeals = await db.collection('users').find({ 
            appealStatus: 'pending' 
        }).toArray();
        console.log(`⏳ Found ${pendingAppeals.length} pending appeals`);
        
        // Display appeal details
        if (pendingAppeals.length > 0) {
            console.log('\n📝 Pending Appeals:');
            pendingAppeals.forEach((user, index) => {
                console.log(`${index + 1}. ${user.firstName} (${user.userId})`);
                console.log(`   Appeal: "${user.appealText}"`);
                console.log(`   Submitted: ${new Date(user.appealedAt).toLocaleString()}`);
                console.log('');
            });
        }
        
        await client.close();
        console.log('✅ Appeal system test completed!');
        
    } catch (error) {
        console.error('❌ Error testing appeal system:', error);
    }
}

testAppealSystem();
