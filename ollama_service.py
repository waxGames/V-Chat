import requests
import json
from config import OLLAMA_API, SUPPORTED_MODELS

def check_ollama_connection():
    try:
        response = requests.get(f"{OLLAMA_API}/tags", timeout=5)
        return response.status_code == 200
    except:
        return False

def get_installed_models():
    try:
        response = requests.get(f"{OLLAMA_API}/tags")
        if response.status_code == 200:
            models_data = response.json().get('models', [])
            return [m.get('name', '') for m in models_data]
        return []
    except:
        return []

def get_available_models():
    installed_models = get_installed_models()
    
    models = []
    for model in SUPPORTED_MODELS:
        models.append({
            'name': model.split(':')[0] if ':' in model else model,
            'full_name': model,
            'is_installed': model in installed_models
        })
    
    return models

def generate_response(message, model='deepseek-r1:5b'):
    try:
        print(f"\n=== AI Response Generation ===")
        print(f"Model: {model}")
        
        response = requests.post(
            f"{OLLAMA_API}/chat",
            json={
                "model": model,
                "messages": [{"role": "user", "content": message}],
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
                print("Empty response received")
                return "Response received but could not be processed. Please try again or use a different model."
            
            return {
                'code': content
            }
            
        except json.JSONDecodeError as json_err:
            print(f"JSON parsing error: {str(json_err)}")
            print(f"Raw response: {response.text}")
            return "An error occurred while processing the response. Please try again."
        
    except requests.exceptions.Timeout:
        print("Response timed out")
        return "Response timed out. Please try again."
    except Exception as e:
        print(f"Ollama error: {str(e)}")
        return f"Ollama communication error: {str(e)}"
    finally:
        print("=== AI Response Generation Completed ===\n")
