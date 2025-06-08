import os

APP_NAME = "V-Chat"
INSTALL_PATH = os.path.join(os.environ.get("ProgramFiles", "C:\\Program Files"), APP_NAME)
USER_DATA_PATH = os.path.join(os.path.expanduser("~"), "AppData", "Local", APP_NAME)
DATA_FILE = os.path.join(INSTALL_PATH, "chats.json")

SECRET_KEY = 'v-chat-secret-key-2024'

OLLAMA_API = "http://localhost:11434/api"

SUPPORTED_MODELS = [
    "deepseek-r1:1.5b",
    "deepseek-r1:7b",
    "deepseek-r1:8b",
    "deepseek-r1:14b",
    "deepseek-r1:32b",
    "deepseek-r1:70b",
    "deepseek-r1:671b",
    
    "qwen3:latest",
    "qwen3:0.6b",
    "qwen3:1.7b",
    "qwen3:4b",
    "qwen3:8b",
    "qwen3:14b",
    "qwen3:30b",
    "qwen3:32b",
    "qwen3:235b",
    "qwen2.5vl:latest",
    "qwen2.5vl:3b",
    "qwen2.5vl:7b",
    "qwen2.5vl:32b",
    "qwen2.5vl:72b",
    
    "llama3.3:latest",
    "llama3.3:70b",
    
    "gemma3:latest",
    "gemma3:1b",
    "gemma3:4b",
    "gemma3:12b",
    "gemma3:27b",
    
    "phi4:latest",
    "phi4:14b"
] 
