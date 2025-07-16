// Test script to verify match ending functionality
console.log('Testing match ending functionality...');

// Simulate the memory storage structure
let memoryMatches = new Map();

// Create a test match
const matchId = "123_456";
const match = {
    id: matchId,
    participants: [123, 456],
    createdAt: new Date(),
    isActive: true
};

// Simulate createMatch
memoryMatches.set(matchId, match);
memoryMatches.set('user_123', matchId);
memoryMatches.set('user_456', matchId);

console.log('Before ending match:');
console.log('Match data:', memoryMatches.get(matchId));
console.log('User 123 match:', memoryMatches.get('user_123'));
console.log('User 456 match:', memoryMatches.get('user_456'));

// Simulate endMatch
const matchToEnd = memoryMatches.get(matchId);
if (matchToEnd) {
    matchToEnd.isActive = false;
    matchToEnd.endedAt = new Date();
    
    // Remove user match references
    for (const userId of matchToEnd.participants) {
        memoryMatches.delete(`user_${userId}`);
    }
}

console.log('\nAfter ending match:');
console.log('Match data:', memoryMatches.get(matchId));
console.log('User 123 match:', memoryMatches.get('user_123'));
console.log('User 456 match:', memoryMatches.get('user_456'));

// Simulate getActiveMatch
function getActiveMatch(userId) {
    const matchId = memoryMatches.get(`user_${userId}`);
    if (matchId) {
        const match = memoryMatches.get(matchId);
        return (match && match.isActive) ? match : null;
    }
    return null;
}

console.log('\ngetActiveMatch results:');
console.log('User 123 active match:', getActiveMatch(123));
console.log('User 456 active match:', getActiveMatch(456));

console.log('\nTest completed!');
