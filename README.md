# vChat

V-Chat is a local, multi-model chat application built with Flask. Users can chat with different AI models and manage their chat history.

## Features
- Web interface with Flask
- Multi-LLM (large language model) support via Ollama API
- User-specific chat history
- Rename, delete, and create new chats
- Model selection and installation check

## Installation

1. **Requirements:**
   - Python 3.8+
   - Ollama (Download and install from https://ollama.com/)

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start Ollama:**
   Make sure Ollama is running in the background (default port: 11434).

4. **Run the application:**
   ```bash
   python app.py
   ```

5. **Access from your browser:**
   The app runs at http://localhost:5000 by default.

## Project Structure

```
FOLDER/
├── app.py                  # Main application file
├── requirements.txt        # Python dependencies
├── README.md               # This file
├── bot/
│   └── ollama_service.py   # Ollama API communication and model management
├── database/
│   └── database.py         # Chat history and data management
├── helpers/
│   ├── config.py           # Configuration and constants
│   └── utils.py            # Utility functions
├── server/
│   └── routes.py           # Flask Blueprint and all routes
├── static/
│   ├── css/                # CSS files
│   └── js/                 # JavaScript files
└── templates/
    ├── index.html          # Main page template
    └── chat.html           # Chat page template
```

## Notes
- Your chats are stored locally and are not sent outside.
- If the Ollama API is not running, model loading and chat features will be disabled.
- On Windows, you may need to run as administrator (for writing to Program Files directory).

## Contribution & License

You can contribute by sending a pull request. For license information, see the LICENSE file.


