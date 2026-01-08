
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
