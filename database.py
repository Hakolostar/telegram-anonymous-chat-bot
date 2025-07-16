import sqlite3
import os
from datetime import datetime
from typing import List, Optional, Dict, Any

class Database:
    def __init__(self, db_path: str = "chat_bot.db"):
        self.db_path = db_path
        self.init_database()
    
    def get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def init_database(self):
        """Initialize database tables"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Users table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    username TEXT,
                    first_name TEXT,
                    age INTEGER,
                    gender TEXT,
                    city TEXT,
                    bio TEXT,
                    looking_for TEXT,
                    min_age INTEGER DEFAULT 18,
                    max_age INTEGER DEFAULT 100,
                    is_active BOOLEAN DEFAULT TRUE,
                    is_in_chat BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Interests table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS interests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    category TEXT
                )
            ''')
            
            # User interests table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_interests (
                    user_id INTEGER,
                    interest_id INTEGER,
                    PRIMARY KEY (user_id, interest_id),
                    FOREIGN KEY (user_id) REFERENCES users (user_id),
                    FOREIGN KEY (interest_id) REFERENCES interests (id)
                )
            ''')
            
            # Chat sessions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user1_id INTEGER,
                    user2_id INTEGER,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ended_at TIMESTAMP,
                    status TEXT DEFAULT 'active',
                    FOREIGN KEY (user1_id) REFERENCES users (user_id),
                    FOREIGN KEY (user2_id) REFERENCES users (user_id)
                )
            ''')
            
            # Chat messages table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    sender_id INTEGER,
                    message TEXT,
                    message_type TEXT DEFAULT 'text',
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES chat_sessions (id),
                    FOREIGN KEY (sender_id) REFERENCES users (user_id)
                )
            ''')
            
            # Populate default interests
            self._populate_default_interests(cursor)
            
            conn.commit()
    
    def _populate_default_interests(self, cursor):
        """Populate database with default interests"""
        default_interests = [
            ('Technology', 'Tech'),
            ('Music', 'Entertainment'),
            ('Movies', 'Entertainment'),
            ('Books', 'Culture'),
            ('Sports', 'Activities'),
            ('Travel', 'Lifestyle'),
            ('Cooking', 'Lifestyle'),
            ('Gaming', 'Entertainment'),
            ('Art', 'Culture'),
            ('Photography', 'Hobbies'),
            ('Fitness', 'Health'),
            ('Dancing', 'Activities'),
            ('Science', 'Education'),
            ('Programming', 'Tech'),
            ('Fashion', 'Lifestyle'),
            ('Anime', 'Entertainment'),
            ('Pets', 'Lifestyle'),
            ('Nature', 'Environment'),
            ('History', 'Education'),
            ('Languages', 'Education')
        ]
        
        cursor.executemany('''
            INSERT OR IGNORE INTO interests (name, category) VALUES (?, ?)
        ''', default_interests)
    
    # User operations
    def create_or_update_user(self, user_id: int, username: str = None, 
                             first_name: str = None, **kwargs):
        """Create or update user profile"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if user exists
            cursor.execute('SELECT user_id FROM users WHERE user_id = ?', (user_id,))
            exists = cursor.fetchone()
            
            if exists:
                # Update existing user
                update_fields = []
                values = []
                for key, value in kwargs.items():
                    if value is not None:
                        update_fields.append(f"{key} = ?")
                        values.append(value)
                
                if update_fields:
                    values.append(user_id)
                    query = f"UPDATE users SET {', '.join(update_fields)}, last_active = CURRENT_TIMESTAMP WHERE user_id = ?"
                    cursor.execute(query, values)
            else:
                # Create new user
                cursor.execute('''
                    INSERT INTO users (user_id, username, first_name, age, gender, city, bio, looking_for, min_age, max_age)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, username, first_name, kwargs.get('age'), kwargs.get('gender'),
                      kwargs.get('city'), kwargs.get('bio'), kwargs.get('looking_for'),
                      kwargs.get('min_age', 18), kwargs.get('max_age', 100)))
            
            conn.commit()
    
    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
            row = cursor.fetchone()
            
            if row:
                columns = [description[0] for description in cursor.description]
                return dict(zip(columns, row))
            return None
    
    def update_user_status(self, user_id: int, is_active: bool = None, is_in_chat: bool = None):
        """Update user status"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            updates = []
            values = []
            
            if is_active is not None:
                updates.append("is_active = ?")
                values.append(is_active)
            
            if is_in_chat is not None:
                updates.append("is_in_chat = ?")
                values.append(is_in_chat)
            
            if updates:
                values.append(user_id)
                query = f"UPDATE users SET {', '.join(updates)}, last_active = CURRENT_TIMESTAMP WHERE user_id = ?"
                cursor.execute(query, values)
                conn.commit()
    
    # Interest operations
    def get_interests(self) -> List[Dict[str, Any]]:
        """Get all available interests"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM interests ORDER BY category, name')
            rows = cursor.fetchall()
            
            columns = [description[0] for description in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
    
    def add_user_interest(self, user_id: int, interest_id: int):
        """Add interest to user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR IGNORE INTO user_interests (user_id, interest_id) VALUES (?, ?)
            ''', (user_id, interest_id))
            conn.commit()
    
    def remove_user_interest(self, user_id: int, interest_id: int):
        """Remove interest from user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM user_interests WHERE user_id = ? AND interest_id = ?
            ''', (user_id, interest_id))
            conn.commit()
    
    def get_user_interests(self, user_id: int) -> List[Dict[str, Any]]:
        """Get user's interests"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT i.* FROM interests i
                JOIN user_interests ui ON i.id = ui.interest_id
                WHERE ui.user_id = ?
                ORDER BY i.category, i.name
            ''', (user_id,))
            rows = cursor.fetchall()
            
            columns = [description[0] for description in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
    
    # Chat operations
    def create_chat_session(self, user1_id: int, user2_id: int) -> int:
        """Create a new chat session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO chat_sessions (user1_id, user2_id) VALUES (?, ?)
            ''', (user1_id, user2_id))
            
            session_id = cursor.lastrowid
            
            # Update users' chat status
            cursor.execute('''
                UPDATE users SET is_in_chat = TRUE WHERE user_id IN (?, ?)
            ''', (user1_id, user2_id))
            
            conn.commit()
            return session_id
    
    def get_active_chat_session(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user's active chat session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM chat_sessions 
                WHERE (user1_id = ? OR user2_id = ?) AND status = 'active'
            ''', (user_id, user_id))
            row = cursor.fetchone()
            
            if row:
                columns = [description[0] for description in cursor.description]
                return dict(zip(columns, row))
            return None
    
    def end_chat_session(self, session_id: int):
        """End a chat session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get session info
            cursor.execute('SELECT user1_id, user2_id FROM chat_sessions WHERE id = ?', (session_id,))
            session = cursor.fetchone()
            
            if session:
                user1_id, user2_id = session
                
                # Update session status
                cursor.execute('''
                    UPDATE chat_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ''', (session_id,))
                
                # Update users' chat status
                cursor.execute('''
                    UPDATE users SET is_in_chat = FALSE WHERE user_id IN (?, ?)
                ''', (user1_id, user2_id))
                
                conn.commit()
    
    def add_chat_message(self, session_id: int, sender_id: int, message: str, message_type: str = 'text'):
        """Add a message to chat session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO chat_messages (session_id, sender_id, message, message_type)
                VALUES (?, ?, ?, ?)
            ''', (session_id, sender_id, message, message_type))
            conn.commit()
    
    # Matching operations
    def find_potential_matches(self, user_id: int) -> List[Dict[str, Any]]:
        """Find potential chat partners for a user"""
        user = self.get_user(user_id)
        if not user:
            return []
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Build matching query based on user preferences
            query = '''
                SELECT u.*, COUNT(ui.interest_id) as shared_interests
                FROM users u
                LEFT JOIN user_interests ui ON u.user_id = ui.user_id
                LEFT JOIN user_interests my_ui ON ui.interest_id = my_ui.interest_id AND my_ui.user_id = ?
                WHERE u.user_id != ?
                AND u.is_active = TRUE
                AND u.is_in_chat = FALSE
                AND u.age BETWEEN ? AND ?
                AND u.looking_for IN (?, 'anyone')
                AND (? = 'anyone' OR u.gender = ?)
            '''
            
            params = [
                user_id,  # for shared interests
                user_id,  # exclude self
                user['min_age'], user['max_age'],  # age range
                user['gender'],  # user's gender for their looking_for
                user['looking_for'], user['looking_for']  # what user is looking for
            ]
            
            # Add city filter if specified
            if user['city']:
                query += ' AND u.city = ?'
                params.append(user['city'])
            
            query += '''
                GROUP BY u.user_id
                ORDER BY shared_interests DESC, RANDOM()
                LIMIT 10
            '''
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            columns = [description[0] for description in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
