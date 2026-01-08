import sqlite3
import os
import shutil
from datetime import datetime
from helpers.config import DATA_FILE, INSTALL_PATH, USER_DATA_PATH

def ensure_data_directory():
    try:
        db_dir = os.path.dirname(DATA_FILE)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        return True
    except Exception as e:
        print(f"Directory creation error: {str(e)}")
        return False

def get_db_connection():
    if not ensure_data_directory():
        return None
    try:
        conn = sqlite3.connect(DATA_FILE)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"Database connection error: {str(e)}")
        return None

def init_db():
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS chats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    chat_id TEXT NOT NULL UNIQUE,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    last_updated TEXT NOT NULL,
                    current_model TEXT
                )
            ''')
            cursor.executescript('''
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    model TEXT,
                    canceled BOOLEAN DEFAULT 0,
                    think TEXT,
                    has_think BOOLEAN DEFAULT 0,
                    FOREIGN KEY (chat_id) REFERENCES chats (chat_id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
                CREATE INDEX IF NOT EXISTS idx_chats_last_updated ON chats(last_updated DESC);
                CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
                CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp ASC);
            ''')
            conn.commit()
            
            old_data_file = os.path.join(INSTALL_PATH, "chats.json")
            if os.path.exists(old_data_file):
                import json
                try:
                    with open(old_data_file, 'r', encoding='utf-8') as f:
                        old_data = json.load(f)
                    
                    chats_dict = old_data.get('chats', {})
                    for user_id, user_chats in chats_dict.items():
                        for chat_id, chat in user_chats.items():
                            cursor.execute('''
                                INSERT OR IGNORE INTO chats (user_id, chat_id, title, created_at, last_updated, current_model)
                                VALUES (?, ?, ?, ?, ?, ?)
                            ''', (
                                user_id, 
                                chat_id, 
                                chat.get('title', 'New Chat'), 
                                chat.get('created_at', datetime.now().isoformat()),
                                chat.get('last_updated', datetime.now().isoformat()),
                                chat.get('current_model')
                            ))
                            
                            for msg in chat.get('messages', []):
                                cursor.execute('''
                                    INSERT INTO messages (chat_id, sender, content, timestamp, model, canceled)
                                    VALUES (?, ?, ?, ?, ?, ?)
                                ''', (
                                    chat_id,
                                    msg.get('sender', 'user'),
                                    msg.get('content', ''),
                                    msg.get('timestamp', datetime.now().isoformat()),
                                    msg.get('model'),
                                    1 if msg.get('canceled') else 0
                                ))
                    conn.commit()
                    os.rename(old_data_file, old_data_file + ".migrated")
                except Exception as e:
                    print(f"Migration error: {str(e)}")
            try:
                cursor.execute("ALTER TABLE messages ADD COLUMN think TEXT")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE messages ADD COLUMN has_think BOOLEAN DEFAULT 0")
            except:
                pass

            try:
                cursor.execute("UPDATE chats SET user_id = 'local_user' WHERE user_id != 'local_user' OR user_id IS NULL")
            except:
                pass
                
            conn.commit()
        except Exception as e:
            print(f"Database initialization error: {str(e)}")
        finally:
            conn.close()

init_db()

def get_all_chats_metadata(user_id='local_user'):
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT id, chat_id, title, last_updated, current_model FROM chats ORDER BY last_updated DESC')
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error fetching chat metadata: {str(e)}")
        return []
    finally:
        conn.close()

def get_chat_with_messages(chat_id):
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM chats WHERE chat_id = ?', (chat_id,))
        chat_row = cursor.fetchone()
        
        if not chat_row:
            return None
            
        chat_data = dict(chat_row)
        chat_data['messages'] = []
        
        cursor.execute('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC', (chat_id,))
        messages_rows = cursor.fetchall()
        for msg_row in messages_rows:
            chat_data['messages'].append({
                'sender': msg_row['sender'],
                'content': msg_row['content'],
                'timestamp': msg_row['timestamp'],
                'model': msg_row['model'],
                'canceled': bool(msg_row['canceled']),
                'think': msg_row['think'],
                'has_think': bool(msg_row['has_think'])
            })
            
        return chat_data
    except Exception as e:
        print(f"Error fetching chat with messages: {str(e)}")
        return None
    finally:
        conn.close()

def get_user_chats(user_id=None):
    metadata = get_all_chats_metadata()
    result = {}
    for chat in metadata:
        chat_id = chat['chat_id']
        result[chat_id] = {
            'title': chat['title'],
            'last_updated': chat['last_updated'],
            'current_model': chat.get('current_model'),
            'messages': [] 
        }
    return result

def create_chat(user_id, chat_id, title="New Chat"):
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        timestamp = datetime.now().isoformat()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO chats (user_id, chat_id, title, created_at, last_updated)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, chat_id, title, timestamp, timestamp))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creating chat: {str(e)}")
        return False
    finally:
        conn.close()

def add_message(user_id, chat_id, message, sender='user', model=None, canceled=False, think=None, has_think=False):
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        timestamp = datetime.now().isoformat()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM chats WHERE chat_id = ?', (chat_id,))
        if not cursor.fetchone():
            return False
            
        cursor.execute('''
            INSERT INTO messages (chat_id, sender, content, timestamp, model, canceled, think, has_think)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (chat_id, sender, message, timestamp, model, 1 if canceled else 0, think, 1 if has_think else 0))
        
        if model:
            cursor.execute('''
                UPDATE chats SET last_updated = ?, current_model = ? WHERE chat_id = ?
            ''', (timestamp, model, chat_id))
        else:
            cursor.execute('''
                UPDATE chats SET last_updated = ? WHERE chat_id = ?
            ''', (timestamp, chat_id))
            
        conn.commit()
        return True
    except Exception as e:
        print(f"Error adding message: {str(e)}")
        return False
    finally:
        conn.close()

def delete_chat(user_id, chat_id):
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM messages WHERE chat_id = ?', (chat_id,))
        cursor.execute('DELETE FROM chats WHERE chat_id = ?', (chat_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error deleting chat: {str(e)}")
        return False
    finally:
        conn.close()

def rename_chat(user_id, chat_id, new_title):
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE chats SET title = ? WHERE chat_id = ?
        ''', (new_title, chat_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error renaming chat: {str(e)}")
        return False
    finally:
        conn.close()

def get_recent_chats_context(user_id, exclude_chat_id, limit=3, msg_limit=5):
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT chat_id, title FROM chats 
            WHERE user_id = ? AND chat_id != ? 
            ORDER BY last_updated DESC LIMIT ?
        ''', (user_id, exclude_chat_id, limit))
        
        chats = cursor.fetchall()
        context_data = []
        
        for chat in chats:
            c_id = chat['chat_id']
            title = chat['title']
            
            cursor.execute('''
                SELECT sender, content FROM messages 
                WHERE chat_id = ? 
                ORDER BY timestamp DESC LIMIT ?
            ''', (c_id, msg_limit))
            
            msgs = cursor.fetchall()
            if msgs:
                chat_context = f"--- Previous Chat: {title} ---\n"
                for m in reversed(msgs):
                    role = "User" if m['sender'] == 'user' else "AI"
                    content = m['content'][:200] + "..." if len(m['content']) > 200 else m['content']
                    chat_context += f"{role}: {content}\n"
                context_data.append(chat_context)
                
        return context_data
    except Exception as e:
        print(f"Error fetching recent chats context: {str(e)}")
        return []
    finally:
        conn.close()
