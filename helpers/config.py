import os

APP_NAME = "V-Chat"
INSTALL_PATH = os.path.join(os.environ.get("ProgramFiles", "C:\\Program Files"), APP_NAME)
USER_DATA_PATH = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~\\AppData\\Local")), APP_NAME)
DATA_FILE = os.path.join(USER_DATA_PATH, "chats.db")

SECRET_KEY = '12345'

OLLAMA_API = "http://localhost:11434/api"
