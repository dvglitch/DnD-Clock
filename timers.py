import time

TIMER_DURATION = 180  # 3 minutes in seconds

# Timer state
timers = {
    i: {
        "remaining": TIMER_DURATION,
        "running": False,
        "last_update": time.time(),
        "name": f"Timer {i}",
        "finished": False
    }
    for i in range(1, 7)
}

finish_order = []

DEFAULT_DURATION = 180

control_state = {
    "locked": False
}

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