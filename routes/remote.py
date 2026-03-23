from flask import Blueprint, render_template

remote_bp = Blueprint("remote", __name__)

@remote_bp.route("/remote")
def remote():
    return render_template("remote.html")