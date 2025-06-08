import json
import os
import shutil
from datetime import datetime
from config import DATA_FILE, INSTALL_PATH

def ensure_data_directory():
    try:
        if not os.path.exists(INSTALL_PATH):
            os.makedirs(INSTALL_PATH, exist_ok=True)
        return True
    except Exception as e:
        print(f"Directory creation error: {str(e)}")
        return False

def load_chats():
    try:
        if not ensure_data_directory():
            return {"chats": {}}
            
        if not os.path.exists(DATA_FILE):
            print(f"Data file not found, creating new one: {DATA_FILE}")
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump({"chats": {}}, f, ensure_ascii=False)
            return {"chats": {}}
                
        backup_file = f"{DATA_FILE}.bak"
        shutil.copy2(DATA_FILE, backup_file)
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if not isinstance(data, dict) or 'chats' not in data:
                print("Invalid data format, restoring from backup")
                if os.path.exists(backup_file):
                    shutil.copy2(backup_file, DATA_FILE)
                    with open(DATA_FILE, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                else:
                    data = {"chats": {}}
            return data
    except Exception as e:
        print(f"Data loading error: {str(e)}")
        backup_file = f"{DATA_FILE}.bak"
        if os.path.exists(backup_file):
            try:
                shutil.copy2(backup_file, DATA_FILE)
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        return {"chats": {}}

def save_chats(data):
    try:
        if not ensure_data_directory():
            return False
            
        temp_file = f"{DATA_FILE}.tmp"
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        if os.path.exists(DATA_FILE):
            backup_file = f"{DATA_FILE}.bak"
            shutil.copy2(DATA_FILE, backup_file)
        
        shutil.move(temp_file, DATA_FILE)
        return True
    except Exception as e:
        print(f"Data saving error: {str(e)}")
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except:
                pass
        return False

def get_user_chats(user_id):
    data = load_chats()
    return data.get('chats', {}).get(user_id, {})

def create_chat(user_id, chat_id, title="New Chat"):
    data = load_chats()
    if user_id not in data['chats']:
        data['chats'][user_id] = {}
    
    timestamp = datetime.now().isoformat()
    data['chats'][user_id][chat_id] = {
        'title': title,
        'messages': [],
        'created_at': timestamp,
        'last_updated': timestamp
    }
    
    return save_chats(data)

def add_message(user_id, chat_id, message, sender='user', model=None):
    data = load_chats()
    if user_id not in data['chats'] or chat_id not in data['chats'][user_id]:
        return False
    
    timestamp = datetime.now().isoformat()
    data['chats'][user_id][chat_id]['messages'].append({
        'sender': sender,
        'content': message,
        'timestamp': timestamp,
        'model': model
    })
    
    data['chats'][user_id][chat_id]['last_updated'] = timestamp
    if model:
        data['chats'][user_id][chat_id]['current_model'] = model
    
    return save_chats(data)

def delete_chat(user_id, chat_id):
    data = load_chats()
    if user_id in data['chats'] and chat_id in data['chats'][user_id]:
        del data['chats'][user_id][chat_id]
        return save_chats(data)
    return False

def rename_chat(user_id, chat_id, new_title):
    data = load_chats()
    if user_id in data['chats'] and chat_id in data['chats'][user_id]:
        data['chats'][user_id][chat_id]['title'] = new_title
        return save_chats(data)
    return False
