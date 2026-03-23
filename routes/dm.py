from flask import Blueprint, render_template

dm_bp = Blueprint("dm", __name__)

@dm_bp.route("/dm")
def dm():
    return render_template("dm.html")