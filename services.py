from typing import Dict, List, Optional
from database import Database

class MatchingService:
    def __init__(self, db: Database):
        self.db = db
    
    def find_match(self, user_id: int) -> Optional[Dict]:
        """Find the best match for a user"""
        user = self.db.get_user(user_id)
        if not user or user['is_in_chat']:
            return None
        
        potential_matches = self.db.find_potential_matches(user_id)
        
        if not potential_matches:
            return None
        
        # Score and rank matches
        scored_matches = []
        for match in potential_matches:
            score = self._calculate_match_score(user, match)
            scored_matches.append((match, score))
        
        # Sort by score (descending)
        scored_matches.sort(key=lambda x: x[1], reverse=True)
        
        # Return the best match
        return scored_matches[0][0] if scored_matches else None
    
    def _calculate_match_score(self, user: Dict, potential_match: Dict) -> float:
        """Calculate compatibility score between two users"""
        score = 0.0
        
        # Shared interests bonus (high weight)
        shared_interests = potential_match.get('shared_interests', 0)
        score += shared_interests * 10
        
        # Age compatibility (closer ages get higher score)
        age_diff = abs(user['age'] - potential_match['age'])
        age_score = max(0, 20 - age_diff)  # Max 20 points for same age
        score += age_score
        
        # City match bonus
        if user['city'] and potential_match['city'] and user['city'].lower() == potential_match['city'].lower():
            score += 15
        
        # Gender preference match
        if self._check_gender_compatibility(user, potential_match):
            score += 25
        
        # Bio length bonus (users with bios are more serious)
        if potential_match.get('bio') and len(potential_match['bio']) > 20:
            score += 5
        
        # Activity bonus (recently active users)
        # This would require more complex date handling
        score += 5  # Placeholder
        
        return score
    
    def _check_gender_compatibility(self, user: Dict, potential_match: Dict) -> bool:
        """Check if gender preferences are compatible"""
        user_looking_for = user.get('looking_for', 'anyone')
        match_looking_for = potential_match.get('looking_for', 'anyone')
        user_gender = user.get('gender', '')
        match_gender = potential_match.get('gender', '')
        
        # Check if user's preference matches potential match's gender
        user_wants_match = (user_looking_for == 'anyone' or 
                           user_looking_for == match_gender)
        
        # Check if potential match's preference matches user's gender
        match_wants_user = (match_looking_for == 'anyone' or 
                           match_looking_for == user_gender)
        
        return user_wants_match and match_wants_user

class ProfileService:
    def __init__(self, db: Database):
        self.db = db
    
    def create_profile_wizard_step(self, user_id: int, step: str) -> Dict:
        """Handle profile creation wizard steps"""
        user = self.db.get_user(user_id)
        
        steps = {
            'age': {
                'question': '🎂 How old are you?',
                'validation': lambda x: x.isdigit() and 13 <= int(x) <= 100,
                'field': 'age',
                'next_step': 'gender'
            },
            'gender': {
                'question': '👤 What\'s your gender?\n\n🔹 Male\n🔹 Female\n🔹 Other',
                'validation': lambda x: x.lower() in ['male', 'female', 'other', 'm', 'f', 'o'],
                'field': 'gender',
                'next_step': 'looking_for'
            },
            'looking_for': {
                'question': '💕 Who would you like to chat with?\n\n🔹 Male\n🔹 Female\n🔹 Anyone',
                'validation': lambda x: x.lower() in ['male', 'female', 'anyone', 'm', 'f', 'a'],
                'field': 'looking_for',
                'next_step': 'city'
            },
            'city': {
                'question': '🏙️ Which city are you from?',
                'validation': lambda x: len(x.strip()) > 0,
                'field': 'city',
                'next_step': 'bio'
            },
            'bio': {
                'question': '📝 Tell us a bit about yourself! (Write a short bio)',
                'validation': lambda x: len(x.strip()) > 10,
                'field': 'bio',
                'next_step': 'interests'
            },
            'interests': {
                'question': '🎯 Let\'s add your interests! Type /interests to manage them.',
                'validation': lambda x: True,
                'field': None,
                'next_step': 'complete'
            }
        }
        
        return steps.get(step, {})
    
    def validate_and_save_field(self, user_id: int, field: str, value: str) -> bool:
        """Validate and save a profile field"""
        if field == 'age':
            if value.isdigit() and 13 <= int(value) <= 100:
                self.db.create_or_update_user(user_id, age=int(value))
                return True
        
        elif field == 'gender':
            gender_map = {'m': 'male', 'f': 'female', 'o': 'other'}
            gender = value.lower()
            if gender in ['male', 'female', 'other']:
                self.db.create_or_update_user(user_id, gender=gender)
                return True
            elif gender in gender_map:
                self.db.create_or_update_user(user_id, gender=gender_map[gender])
                return True
        
        elif field == 'looking_for':
            looking_map = {'m': 'male', 'f': 'female', 'a': 'anyone'}
            looking = value.lower()
            if looking in ['male', 'female', 'anyone']:
                self.db.create_or_update_user(user_id, looking_for=looking)
                return True
            elif looking in looking_map:
                self.db.create_or_update_user(user_id, looking_for=looking_map[looking])
                return True
        
        elif field == 'city':
            if len(value.strip()) > 0:
                self.db.create_or_update_user(user_id, city=value.strip().title())
                return True
        
        elif field == 'bio':
            if len(value.strip()) > 10:
                self.db.create_or_update_user(user_id, bio=value.strip())
                return True
        
        return False
    
    def get_profile_completion_status(self, user_id: int) -> Dict:
        """Check which profile fields are completed"""
        user = self.db.get_user(user_id)
        if not user:
            return {'completed': False, 'missing_fields': ['all']}
        
        required_fields = ['age', 'gender', 'looking_for', 'city', 'bio']
        missing_fields = []
        
        for field in required_fields:
            if not user.get(field):
                missing_fields.append(field)
        
        user_interests = self.db.get_user_interests(user_id)
        if not user_interests:
            missing_fields.append('interests')
        
        return {
            'completed': len(missing_fields) == 0,
            'missing_fields': missing_fields,
            'next_step': missing_fields[0] if missing_fields else 'complete'
        }

class ChatService:
    def __init__(self, db: Database):
        self.db = db
    
    def start_chat(self, user1_id: int, user2_id: int) -> int:
        """Start a chat session between two users"""
        session_id = self.db.create_chat_session(user1_id, user2_id)
        return session_id
    
    def send_message(self, session_id: int, sender_id: int, message: str, message_type: str = 'text'):
        """Send a message in a chat session"""
        self.db.add_chat_message(session_id, sender_id, message, message_type)
    
    def end_chat(self, session_id: int):
        """End a chat session"""
        self.db.end_chat_session(session_id)
    
    def get_chat_partner(self, session_id: int, user_id: int) -> Optional[int]:
        """Get the other user in a chat session"""
        session = self.db.get_active_chat_session(user_id)
        if not session:
            return None
        
        if session['user1_id'] == user_id:
            return session['user2_id']
        else:
            return session['user1_id']
