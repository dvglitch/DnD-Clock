import time

TIMER_DURATION = 180  # 3 minutes in seconds

# Dynamic configuration
num_timers = 6
dm_exclusive = False

# Timer state (will be populated dynamically)
timers = {}
finish_order = []

DEFAULT_DURATION = 180

control_state = {
    "locked": False,
    "num_timers": num_timers,
    "dm_exclusive": dm_exclusive
}

def init_timers():
    """Initialize timers based on num_timers setting"""
    global timers, finish_order
    timers = {
        i: {
            "remaining": DEFAULT_DURATION,
            "running": False,
            "last_update": time.time(),
            "name": f"Timer {i}",
            "finished": False
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