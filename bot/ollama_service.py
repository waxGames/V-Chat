import requests
import json
from helpers.config import OLLAMA_API
from functools import lru_cache
import time

def check_ollama_connection():
    try:
        response = requests.get(f"{OLLAMA_API}/tags", timeout=5)
        return response.status_code == 200
    except:
        return False

@lru_cache(maxsize=1)
def get_installed_models_cached(ttl_hash):
    del ttl_hash
    try:
        response = requests.get(f"{OLLAMA_API}/tags", timeout=2)
        if response.status_code == 200:
            models_data = response.json().get('models', [])
            return [m.get('name', '') for m in models_data]
        return []
    except:
        return []

def get_installed_models():
    return get_installed_models_cached(int(time.time() / 60))

@lru_cache(maxsize=1)
def get_available_models_cached(ttl_hash):
    del ttl_hash
    try:
        response = requests.get(f"{OLLAMA_API}/tags", timeout=2)
        if response.status_code == 200:
            models_data = response.json().get('models', [])
            models = []
            for m in models_data:
                full_name = m.get('name', '')
                models.append({
                    'name': full_name.split(':')[0] if ':' in full_name else full_name,
                    'full_name': full_name,
                    'is_installed': True
                })
            return models
        return []
    except:
        return []

def get_available_models():
    return get_available_models_cached(int(time.time() / 60))

def generate_response(context_messages, model='deepseek-r1:5b'):
    try:
        response = requests.post(
            f"{OLLAMA_API}/chat",
            json={
                "model": model,
                "messages": context_messages,
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"Ollama API error: {response.text}")
            return f"Ollama API error: {response.text}"
        
        try:
            response_data = response.json()
            content = response_data.get('message', {}).get('content', '')
            
            if not content:
                return "Response received but could not be processed. Please try again or use a different model."
            
            think = ""
            if "<think>" in content and "</think>" in content:
                think = content.split("<think>")[1].split("</think>")[0].strip()
                content = content.split("</think>")[1].strip()
            elif "<think>" in content:
                parts = content.split("<think>")
                think = parts[1].strip()
                content = parts[0].strip()

            return {
                'code': content,
                'think': think,
                'has_think': bool(think)
            }
            
        except json.JSONDecodeError as json_err:
            print(f"JSON parsing error: {str(json_err)}")
            print(f"Raw response: {response.text}")
            return "An error occurred while processing the response. Please try again."
        
    except requests.exceptions.Timeout:
        return "Response timed out. Please try again."
    except Exception as e:
        print(f"Ollama error: {str(e)}")
        return f"Ollama communication error: {str(e)}"
    finally:
        pass
