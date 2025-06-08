import os
import sys
import ctypes
from config import INSTALL_PATH, USER_DATA_PATH

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def run_as_admin():
    if not is_admin():
        script = os.path.abspath(sys.argv[0])
        params = " ".join([script] + sys.argv[1:])
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, params, None, 1)
        sys.exit()

def setup_environment():
    try:
        if not os.path.exists(INSTALL_PATH):
            os.makedirs(INSTALL_PATH, exist_ok=True)
        
        if not os.path.exists(USER_DATA_PATH):
            os.makedirs(USER_DATA_PATH, exist_ok=True)
        
        test_file = os.path.join(INSTALL_PATH, "test.tmp")
        try:
            with open(test_file, 'w') as f:
                f.write("test")
            os.remove(test_file)
        except PermissionError:
            print("Program Files dizinine yazma izni yok. Yönetici olarak çalıştırılmalı.")
            return False
            
        test_file = os.path.join(USER_DATA_PATH, "test.tmp")
        with open(test_file, 'w') as f:
            f.write("test")
        os.remove(test_file)
        return True
    except Exception as e:
        print(f"Setup error: {str(e)}")
        return False
