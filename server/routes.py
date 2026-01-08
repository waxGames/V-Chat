from flask import Blueprint, request, render_template, jsonify, session, redirect, url_for
import uuid
from datetime import datetime

from database.database import (
    get_user_chats, create_chat, add_message,
    delete_chat, rename_chat, get_all_chats_metadata,
    get_chat_with_messages, get_recent_chats_context
)
from bot.ollama_service import (
    check_ollama_connection, get_available_models,
    generate_response
)

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    if 'user_id' not in session:
        session['user_id'] = 'local_user'
    
    if session.get('waiting_for_response', False):
        current_chat_id = session.get('current_chat_id')
        if current_chat_id:
            return redirect(url_for('main.chat_view', chat_id=current_chat_id))
    
    chats = get_all_chats_metadata(session['user_id'])
    
    return render_template('index.html', chats=[(c['chat_id'], c) for c in chats])

@bp.route('/chat/<chat_id>')
def chat_view(chat_id):
    if 'user_id' not in session:
        session['user_id'] = 'local_user'
        
    if session.get('waiting_for_response', False):
        return redirect(url_for('main.chat_view', chat_id=session.get('current_chat_id', chat_id)))
        
    current_chat = get_chat_with_messages(chat_id)
    
    if not current_chat:
        return redirect(url_for('main.index'))
    
    session['current_chat_id'] = chat_id
    chats_metadata = get_all_chats_metadata(session['user_id'])
    
    return render_template('chat.html',
                         chat_id=chat_id,
                         chat_title=current_chat['title'],
                         messages=current_chat['messages'],
                         chats=[(c['chat_id'], c) for c in chats_metadata],
                         current_chat=current_chat)

@bp.route('/get_chats')
def get_chats():
    if 'user_id' not in session:
        session['user_id'] = 'local_user'
    
    chats = get_all_chats_metadata(session['user_id'])
    
    chat_list = []
    for chat in chats:
        chat_list.append({
            'id': chat['chat_id'],
            'title': chat.get('title', 'Untitled Chat'),
            'last_updated': chat.get('last_updated', '')
        })
    
    return jsonify({'chats': chat_list})

@bp.route('/new_chat', methods=['POST'])
def new_chat():
    if session.get('waiting_for_response', False):
        return jsonify({'success': False, 'error': 'Cannot create a new chat while waiting for response'})
        
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
    if 'user_id' not in session:
        session['user_id'] = 'local_user'
    
    if session.get('waiting_for_response', False):
        session['waiting_for_response'] = False
    
    message = request.json.get('message', '').strip()
    model = request.json.get('model', 'deepseek-r1:5')
    
    if not message:
        return jsonify({'success': False, 'error': 'Message cannot be empty'})
    
    try:
        if not check_ollama_connection():
            return jsonify({
                'success': False,
                'error': 'Could not connect to Ollama API. Please make sure Ollama is running.'
            })
            
        installed_models = [m['full_name'] for m in get_available_models() if m['is_installed']]
        if model not in installed_models:
            return jsonify({
                'success': False,
                'error': f'Model not installed. Please install "{model}" from Ollama first.'
            })
            
        session['waiting_for_response'] = True
        
        if not add_message(session['user_id'], chat_id, message, 'user', model):
            session['waiting_for_response'] = False
            return jsonify({'success': False, 'error': 'Message could not be saved'})
        
        chat_data = get_chat_with_messages(chat_id)
        context_messages = []
        
        try:
            other_chats_context = get_recent_chats_context(session['user_id'], chat_id, limit=3, msg_limit=3)
            if other_chats_context:
                global_context_str = "You have access to the user's previous separate chats for context:\n\n" + "\n".join(other_chats_context)
                context_messages.append({
                    "role": "system", 
                    "content": global_context_str
                })
        except Exception as e:
            print(f"Error adding global context: {e}")

        if chat_data and 'messages' in chat_data:
            for msg in chat_data['messages']:
                if msg.get('canceled'):
                    continue
                role = 'user' if msg['sender'] == 'user' else 'assistant'
                context_messages.append({
                    "role": role,
                    "content": msg['content']
                })
        
        if not context_messages:
             context_messages = [{"role": "user", "content": message}]

        ai_response = generate_response(context_messages, model)
        
        if ai_response is None:
            return jsonify({'success': False, 'error': 'Canceled'})
        
        if not add_message(session['user_id'], chat_id, ai_response['code'], 'ai', model, 
                          think=ai_response.get('think'), has_think=ai_response.get('has_think')):
            session['waiting_for_response'] = False
            return jsonify({'success': False, 'error': 'Bot response could not be saved'})
        
        updated_chat = get_chat_with_messages(chat_id)
        
        session['waiting_for_response'] = False
        return jsonify({
            'success': True,
            'response': ai_response['code'],
            'think': ai_response.get('think'),
            'has_think': ai_response.get('has_think'),
            'chat_title': updated_chat['title'] if updated_chat else "Untitled Chat"
        })
            
    except Exception as e:
        session['waiting_for_response'] = False
        return jsonify({
            'success': False,
            'error': f"Error: {str(e)}"
        })
    finally:
        session['waiting_for_response'] = False

@bp.route('/chat/<chat_id>/delete', methods=['POST'])
def delete_chat_route(chat_id):
    if delete_chat(session['user_id'], chat_id):
        return jsonify({'success': True, 'redirect': url_for('main.index')})
    return jsonify({'success': False, 'error': 'Chat could not be deleted'})

@bp.route('/chat/<chat_id>/cancel', methods=['POST'])
def cancel_message(chat_id):
    if not session.get('waiting_for_response', False):
        return jsonify({'success': False, 'error': 'No response to cancel'})
    
    if add_message(session['user_id'], chat_id, 'Canceled', 'ai', canceled=True):
        session['waiting_for_response'] = False
        return jsonify({'success': True})
    
    session['waiting_for_response'] = False
    return jsonify({'success': False, 'error': 'Cancel status could not be saved or chat not found'})

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
