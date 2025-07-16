// Debug version with enhanced logging
require('dotenv').config();

const { MongoClient } = require('mongodb');

async function testMatchLogic() {
    console.log('🔍 Testing MongoDB match logic...');
    
    const MONGO_URI = process.env.MONGO_URI;
    let db = null;
    
    try {
        console.log('🔌 Connecting to MongoDB...');
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db('anonymous_chat_bot');
        console.log('✅ MongoDB connected successfully');
        
        // Check existing matches
        console.log('\n📊 Checking existing matches...');
        const existingMatches = await db.collection('matches').find({}).toArray();
        console.log('Existing matches count:', existingMatches.length);
        
        if (existingMatches.length > 0) {
            console.log('Sample matches:');
            existingMatches.slice(0, 3).forEach((match, i) => {
                console.log(`${i + 1}. ID: ${match.id}, Active: ${match.isActive}, Participants: ${match.participants}`);
            });
            
            // Check for any active matches
            const activeMatches = await db.collection('matches').find({ isActive: true }).toArray();
            console.log('\nActive matches count:', activeMatches.length);
            
            if (activeMatches.length > 0) {
                console.log('Active matches:');
                activeMatches.forEach((match, i) => {
                    console.log(`${i + 1}. ID: ${match.id}, Participants: ${match.participants}, Created: ${match.createdAt}`);
                });
                
                // Show how to properly end these matches
                console.log('\n� To fix the issue, these active matches need to be ended properly.');
                console.log('Would you like to end all active matches? (This would fix the issue)');
            }
        }
        
        console.log('✅ Inspection completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (db) {
            console.log('🔌 Closing database connection...');
            process.exit(0);
        }
    }
}

testMatchLogic();
