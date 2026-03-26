import time
from persistence import load_settings

# Load settings from persistence
settings = load_settings()

# Dynamic configuration
num_timers = settings["num_timers"]
dm_exclusive = settings["dm_exclusive"]
locked = settings.get("locked", False)
adjust_locked = settings.get("adjust_locked", False)
DEFAULT_DURATION = settings["DEFAULT_DURATION"]

# Timer state (will be populated dynamically)
timers = {}
finish_order = []

control_state = {
    "locked": locked,
    "adjust_locked": adjust_locked,
    "num_timers": num_timers,
    "dm_exclusive": dm_exclusive,
    "DEFAULT_DURATION": DEFAULT_DURATION
}

def init_timers():
    """Initialize timers based on num_timers setting"""
    global timers, finish_order
    settings = load_settings()
    timers = {
        i: {
            "remaining": DEFAULT_DURATION,
            "running": False,
            "last_update": time.time(),
            "name": settings.get("timer_names", {}).get(str(i), f"Timer {i}"),
            "finished": False,
            "raised_hand": False,
            "condition": "",
            "duration": DEFAULT_DURATION
        }
        for i in range(1, num_timers + 1)
    }
    finish_order = []

# Initialize timers on startup
init_timers()

def timer_loop(socketio):
    while True:
        now = time.time()

        # ✅ Loop with BOTH id and timer
        for i, t in timers.items():
            if t["running"]:
                elapsed = now - t["last_update"]
                t["remaining"] = max(0, t["remaining"] - elapsed)
                t["last_update"] = now

                # ✅ Detect first time reaching 0
                if t["remaining"] <= 0 and not t["finished"]:
                    t["remaining"] = 0
                    t["finished"] = True
                    t["running"] = False
                    finish_order.append(i)

        # ✅ Build position map
        positions = {tid: idx + 1 for idx, tid in enumerate(finish_order)}

        # ✅ Attach position to each timer
        payload = {
            i: {
                **t,
                "position": positions.get(i)
            }
            for i, t in timers.items()
        }

        socketio.emit("update", payload)

        socketio.sleep(0.5)  # ✅ important for Flask-SocketIO threading mode