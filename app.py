from flask import Flask
from routes import bp
from utils import setup_environment, run_as_admin
from config import SECRET_KEY

def create_app():
    app = Flask(__name__)
    app.secret_key = SECRET_KEY
    
    app.register_blueprint(bp)
    
    return app

if __name__ == '__main__':
    if not setup_environment():
        run_as_admin()
        exit()
    
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True) 
