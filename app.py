
from flask import Flask
from flask_socketio import SocketIO
from routes.control import control_bp
from routes.display import display_bp
from routes.dm import dm_bp
from routes.qr import qr_bp
from routes.remote import remote_bp
from socket_events import register_socket_events
from timers import timer_loop
from utils import get_local_ip
import webbrowser
from threading import Timer
import os
from flask import jsonify


app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

app.register_blueprint(control_bp)
app.register_blueprint(display_bp)
app.register_blueprint(dm_bp)
app.register_blueprint(qr_bp)
app.register_blueprint(remote_bp)

register_socket_events(socketio)

socketio.start_background_task(timer_loop, socketio)

@app.route("/api/sounds")
def list_sounds():
    sounds_dir = os.path.join(app.root_path, "static", "sounds")
    if not os.path.exists(sounds_dir):
        return jsonify([])
    files = [f for f in os.listdir(sounds_dir) if f.endswith(('.mp3', '.wav', '.ogg'))]
    return jsonify(sorted(files))

if __name__ == "__main__":
    ip = get_local_ip()
    print(f"\nServer running at:")
    print(f"  Local:   http://localhost:5000")
    print(f"  Network: http://{ip}:5000\n")

    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
