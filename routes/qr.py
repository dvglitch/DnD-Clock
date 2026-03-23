from flask import Blueprint, render_template, send_file
import qrcode
import io
from utils import get_local_ip

qr_bp = Blueprint("qr", __name__)

@qr_bp.route("/qr")
def qr():
    ip = get_local_ip()
    url = f"http://{ip}:5000/remote"

    img = qrcode.make(url)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return send_file(buf, mimetype="image/png")