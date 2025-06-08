from flask import Blueprint, request, render_template, jsonify, session, redirect, url_for
import uuid
from datetime import datetime

from database import (
    get_user_chats, create_chat, add_message,
    delete_chat, rename_chat
)
from ollama_service import (
    check_ollama_connection, get_available_models,
    generate_response
)

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    
    user_chats = get_user_chats(session['user_id'])
    sorted_chats = sorted(user_chats.items(), key=lambda x: x[1].get('last_updated', ''), reverse=True)
    
    print(f"User ID: {session['user_id']}")
    print(f"Number of chats: {len(sorted_chats)}")
    
    return render_template('index.html', chats=sorted_chats)

@bp.route('/chat/<chat_id>')
def chat_view(chat_id):
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        
    user_chats = get_user_chats(session['user_id'])
    
    if chat_id not in user_chats:
        return redirect(url_for('main.index'))
    
    sorted_chats = sorted(user_chats.items(), key=lambda x: x[1].get('last_updated', ''), reverse=True)
    
    return render_template('chat.html',
                         chat_id=chat_id,
                         chat_title=user_chats[chat_id]['title'],
                         messages=user_chats[chat_id]['messages'],
                         chats=sorted_chats,
                         current_chat=user_chats[chat_id])

@bp.route('/get_chats')
def get_chats():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        print(f"get_chats: New user created: {session['user_id']}")
    else:
        print(f"get_chats: Existing user: {session['user_id']}")
    
    print(f"get_chats: Endpoint called at {datetime.now().isoformat()}")
    
    user_chats = get_user_chats(session['user_id'])
    
    chat_list = []
    for chat_id, chat in user_chats.items():
        chat_list.append({
            'id': chat_id,
            'title': chat.get('title', 'Untitled Chat'),
            'last_updated': chat.get('last_updated', '')
        })
    
    chat_list.sort(key=lambda x: x.get('last_updated', ''), reverse=True)
    
    print(f"get_chats: Returned chat list: {chat_list}")
    return jsonify({'chats': chat_list})

@bp.route('/new_chat', methods=['POST'])
def new_chat():
    chat_id = str(uuid.uuid4())
    
    if create_chat(session['user_id'], chat_id):
        return jsonify({
            'success': True,
            'chat_id': chat_id,
            'redirect': url_for('main.chat_view', chat_id=chat_id)
        })
    
    return jsonify({'success': False, 'error': 'Chat could not be created'})

@bp.route('/chat/<chat_id>/send', methods=['POST'])
def send_message(chat_id):
    print(f"\n=== New Message Request ===")
    print(f"Chat ID: {chat_id}")
    print(f"Session ID: {session.get('user_id', 'None')}")
    print(f"Waiting for response: {session.get('waiting_for_response', False)}")
    
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        print(f"New user created: {session['user_id']}")
    
    if session.get('waiting_for_response', False):
        print("Already waiting for a response, resetting session state...")
        session['waiting_for_response'] = False
    
    message = request.json.get('message', '').strip()
    model = request.json.get('model', 'deepseek-r1:5')
    
    print(f"Model: {model}")
    
    if not message:
        return jsonify({'success': False, 'error': 'Message cannot be empty'})
    
    try:
        if not check_ollama_connection():
            print("Ollama API connection error")
            return jsonify({
                'success': False,
                'error': 'Could not connect to Ollama API. Please make sure Ollama is running.'
            })
            
        installed_models = [m['full_name'] for m in get_available_models() if m['is_installed']]
        if model not in installed_models:
            print(f"Model not found: {model}")
            return jsonify({
                'success': False,
                'error': f'Model not installed. Please install "{model}" from Ollama first.'
            })
            
        session['waiting_for_response'] = True
        print("Response waiting state active")
        
        user_chats = get_user_chats(session['user_id'])
        if chat_id not in user_chats:
            session['waiting_for_response'] = False
            print("Chat not found")
            return jsonify({'success': False, 'error': 'Chat not found'})
        
        if not add_message(session['user_id'], chat_id, message, 'user', model):
            session['waiting_for_response'] = False
            print("Message could not be saved")
            return jsonify({'success': False, 'error': 'Message could not be saved'})
        
        print("Getting AI response...")
        ai_response = generate_response(message, model)
        
        if ai_response is None:
            print("Response generation canceled")
            return jsonify({'success': False, 'error': 'Canceled'})
        
        current_chat = get_user_chats(session['user_id']).get(chat_id, {})
        current_model = current_chat.get('current_model')
        
        if current_model != model:
            session['waiting_for_response'] = False
            print("Model changed")
            return jsonify({
                'success': False,
                'error': 'Model changed during response generation'
            })

        if not add_message(session['user_id'], chat_id, ai_response['code'], 'ai', model):
            session['waiting_for_response'] = False
            print("Bot response could not be saved")
            return jsonify({'success': False, 'error': 'Bot response could not be saved'})
        
        session['waiting_for_response'] = False
        print("Sending response")
        return jsonify({
            'success': True,
            'response': ai_response['code'],
            'chat_title': user_chats[chat_id]['title']
        })
            
    except Exception as e:
        session['waiting_for_response'] = False
        print(f"Error occurred: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Error: {str(e)}"
        })
    finally:
        session['waiting_for_response'] = False
        print("Response waiting state reset")
        print("=== Operation Completed ===\n")

@bp.route('/chat/<chat_id>/delete', methods=['POST'])
def delete_chat_route(chat_id):
    if delete_chat(session['user_id'], chat_id):
        return jsonify({'success': True, 'redirect': url_for('main.index')})
    return jsonify({'success': False, 'error': 'Chat could not be deleted'})

@bp.route('/chat/<chat_id>/cancel', methods=['POST'])
def cancel_message(chat_id):
    if not session.get('waiting_for_response', False):
        return jsonify({'success': False, 'error': 'No response to cancel'})
    
    user_chats = get_user_chats(session['user_id'])
    if chat_id not in user_chats:
        session['waiting_for_response'] = False
        return jsonify({'success': False, 'error': 'Chat not found'})
    
    if add_message(session['user_id'], chat_id, 'Canceled', 'ai', canceled=True):
        session['waiting_for_response'] = False
        return jsonify({'success': True})
    
    session['waiting_for_response'] = False
    return jsonify({'success': False, 'error': 'Cancel status could not be saved'})

@bp.route('/chat/<chat_id>/rename', methods=['POST'])
def rename_chat_route(chat_id):
    new_title = request.json.get('title', '').strip()
    
    if not new_title:
        return jsonify({'success': False, 'error': 'Title cannot be empty'})
    
    if rename_chat(session['user_id'], chat_id, new_title):
        return jsonify({'success': True, 'title': new_title})
    
    return jsonify({'success': False, 'error': 'Title could not be updated'})

@bp.route('/get_ollama_models', methods=['GET'])
def get_ollama_models():
    try:
        models = get_available_models()
        return jsonify({'success': True, 'models': models})
    except Exception as e:
        return jsonify({'success': False, 'error': f"Ollama communication error: {str(e)}"})
