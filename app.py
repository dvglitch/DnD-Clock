
from flask import Flask
from flask_socketio import SocketIO
from routes.control import control_bp
from routes.display import display_bp
from routes.dm import dm_bp
from routes.home import home_bp
from routes.qr import qr_bp
from routes.remote import remote_bp
from socket_events import register_socket_events
from timers import timer_loop
from utils import get_local_ip
import webbrowser
from threading import Timer
import os
import sys
from flask import jsonify, send_from_directory


# Path resolution for PyInstaller
def get_resource_path(relative_path):
    if getattr(sys, 'frozen', False):
        # Running as a bundled executable
        exe_dir = os.path.dirname(sys.executable)
        external_path = os.path.join(exe_dir, relative_path)
        # Create the folder if it doesn't exist
        if not os.path.exists(external_path):
            os.makedirs(external_path, exist_ok=True)
        return external_path
    else:
        # Running as a script
        return os.path.join(os.path.dirname(__file__), "static", relative_path)

EXTERNAL_SOUNDS_DIR = get_resource_path("sounds")
EXTERNAL_IMAGES_DIR = get_resource_path("images")

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Custom routes to serve external assets
@app.route('/static/sounds/<path:filename>')
def serve_external_sounds(filename):
    return send_from_directory(EXTERNAL_SOUNDS_DIR, filename)

@app.route('/static/images/<path:filename>')
def serve_external_images(filename):
    return send_from_directory(EXTERNAL_IMAGES_DIR, filename)

app.register_blueprint(control_bp)
app.register_blueprint(display_bp)
app.register_blueprint(dm_bp)
app.register_blueprint(home_bp)
app.register_blueprint(qr_bp)
app.register_blueprint(remote_bp)

register_socket_events(socketio)

socketio.start_background_task(timer_loop, socketio)

@app.route("/api/sounds")
def list_sounds():
    if not os.path.exists(EXTERNAL_SOUNDS_DIR):
        return jsonify([])
    files = [f for f in os.listdir(EXTERNAL_SOUNDS_DIR) if f.endswith(('.mp3', '.wav', '.ogg'))]
    return jsonify(sorted(files))

if __name__ == "__main__":
    ip = get_local_ip()
    print(f"\nServer running at:")
    print(f"  Local:   http://localhost:5000")
    print(f"  Network: http://{ip}:5000\n")

    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
