from timers import timers, finish_order, DEFAULT_DURATION, control_state
import time

def register_socket_events(socketio):
    @socketio.on("toggle")
    def toggle(data):
        if control_state["locked"]:
            return

        t = timers[data["timer"]]
        t["running"] = not t["running"]
        t["last_update"] = time.time()

    @socketio.on("reset")
    def reset(data):
        i = data["timer"]
        t = timers[i]

        t["remaining"] = DEFAULT_DURATION
        t["running"] = False
        t["last_update"] = time.time()
        t["finished"] = False

        if i in finish_order:
            finish_order.remove(i)

    @socketio.on("toggle_all")
    def toggle_all():
        now = time.time()
        any_running = any(t["running"] for t in timers.values())

        for t in timers.values():
            t["running"] = not any_running
            t["last_update"] = now


    @socketio.on("reset_all")
    def reset_all():
        for t in timers.values():
            t["remaining"] = DEFAULT_DURATION
            t["running"] = False
            t["last_update"] = time.time()


    @socketio.on("set_all_time")
    def set_all_time(data):
        global DEFAULT_DURATION
        DEFAULT_DURATION = int(data["seconds"])


    @socketio.on("set_timer")
    def set_timer(data):
        t = timers[data["timer"]]
        t["remaining"] = int(data["seconds"])
        t["running"] = False
        t["last_update"] = time.time()


    @socketio.on("lock_controls")
    def lock_controls(data):
        control_state["locked"] = data["locked"]
        socketio.emit("control_update", control_state)

    @socketio.on("connect")
    def send_control_state():
        socketio.emit("control_update", control_state)

    @socketio.on("adjust_timer")
    def adjust_timer(data):
        t = timers[data["timer"]]
        t["remaining"] = max(0, t["remaining"] + int(data["delta"]))
        t["last_update"] = time.time()

    @socketio.on("set_name")
    def set_name(data):
        timers[data["timer"]]["name"] = data["name"]