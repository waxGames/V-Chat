# V-Chat (v2.0)

V-Chat is a modern, privacy-focused, and locally-hosted AI chat interface. Powered by **Ollama**, it ensures your data remains entirely on your machine while providing a high-performance experience with models like DeepSeek, Llama, and Mistral.

## Key Features

- **Local & Private:** All processing happens on your own hardware; no data is ever sent to external servers.
- **Thought Tracking:** Specifically designed to visualize the "reasoning" (thinking) processes of models like DeepSeek-R1.
- **Premium UI/UX:** A responsive, sleek web interface featuring Light and Dark modes with glassmorphism aesthetics.
- **Persistent History:** Your conversations are securely stored in a local SQLite database, allowing you to resume them anytime.
- **Seamless Setup:** Automated environment configuration for Windows, including intelligent administrator privilege handling.

## Quick Start

### 1. Prerequisites
- **Python 3.8+**
- **[Ollama](https://ollama.com/)** (Download, install, and ensure it is running in the background)

### 2. Installation
Clone or download the project, then install the required dependencies:
```bash
pip install -r requirements.txt
```

### 3. Usage
Start the application:
```bash
python app.py
```
Once started, open your browser and navigate to:
`http://localhost:5335`

## Project Structure

```text
V-Chat/
├── app.py              # Application entry point and Flask server configuration
├── requirements.txt    # Essential Python libraries
├── bot/                # Ollama API communication and AI logic
├── database/           # SQLite database operations (chats.db)
├── helpers/            # Utility functions and environment configuration
├── server/             # Flask routes and API endpoints
├── static/             # Frontend assets (CSS, JS, Images)
└── templates/          # HTML templates
```

## Technology Stack
- **Backend:** Flask (Python)
- **Frontend:** Vanilla JS, Modern CSS (Custom variables, Gradients, Glassmorphism)
- **AI Engine:** Ollama API
- **Database:** SQLite

## Important Notes
- The application runs on port **5335** by default.
- On Windows, if administrative privileges are required (e.g., for Program Files access), the app will automatically request UAC approval.
- Chat data is stored locally in the `%LocalAppData%/V-Chat` directory.

---
*V-Chat: Your personal, secure AI companion.*
