# V-Chat

V-Chat is an AI chat application that uses the Ollama API. It is developed with the Flask web framework and offers a user-friendly interface.

## Features

- Ollama API integration
- Multiple model support (DeepSeek, Qwen, Llama, Gemma, Phi)
- Chat history management
- Session management
- Chat title editing
- Chat deletion
- Real-time response generation

## Requirements

- Python 3.8+
- Flask
- Requests
- Ollama (local installation)

## Installation

1. Download and install Ollama from the [official website](https://ollama.ai/)
2. Clone the project:
```bash
git clone https://github.com/waxGames/V-Chat.git
```

3. Install required Python packages:
```bash
pip install -r requirements.txt
```

4. Run the application:
```bash
python app.py
```

## Usage

1. The application runs on `http://localhost:5000` by default
2. Open the address in your browser
3. Start a new chat or continue with your existing chats
4. Select your desired model and type your message

## Security

- The application stores user data locally
- A secure secret key is used for session management
- Administrator rights may be required for writing to the Program Files directory

## License

This project is licensed under the GNU Affero General Public License v3.0. 
