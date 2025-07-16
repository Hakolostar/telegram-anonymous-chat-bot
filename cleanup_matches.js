// Quick fix script to clean up any stuck active matches
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function cleanupMatches() {
    const MONGO_URI = process.env.MONGO_URI;
    
    if (!MONGO_URI) {
        console.log('No MongoDB URI found, using memory storage - no cleanup needed');
        return;
    }
    
    try {
        console.log('Connecting to MongoDB...');
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db('anonymous_chat_bot');
        
        // End all active matches
        const result = await db.collection('matches').updateMany(
            { isActive: true },
            { $set: { isActive: false, endedAt: new Date() } }
        );
        
        console.log(`Ended ${result.modifiedCount} active matches`);
        console.log('✅ Cleanup completed!');
        
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupMatches();
