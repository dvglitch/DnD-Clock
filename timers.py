import time
from persistence import load_settings, save_settings

# Load settings from persistence
settings = load_settings()

# Dynamic configuration
num_timers = settings["num_timers"]
dm_exclusive = settings["dm_exclusive"]
locked = settings.get("locked", False)
adjust_locked = settings.get("adjust_locked", False)
DEFAULT_DURATION = settings["DEFAULT_DURATION"]
theme = settings.get("theme", "tavern")

# Timer state (will be populated dynamically)
timers = {}
finish_order = []

control_state = {
    "locked": locked,
    "adjust_locked": adjust_locked,
    "num_timers": num_timers,
    "dm_exclusive": dm_exclusive,
    "DEFAULT_DURATION": DEFAULT_DURATION,
    "theme": theme
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

def save_current_state():
    """Saves the current variables down to the persistence layer"""
    settings = {
        "num_timers": num_timers,
        "dm_exclusive": dm_exclusive,
        "locked": control_state["locked"],
        "adjust_locked": control_state.get("adjust_locked", False),
        "DEFAULT_DURATION": DEFAULT_DURATION,
        "timer_names": {str(k): v["name"] for k, v in timers.items()},
        "theme": theme
    }
    save_settings(settings)

# ==========================================
# ====== STATE MUTATION APIS ===============
# ==========================================

def update_control_state(key, value):
    """Updates a global control variable, syncs state, and persists."""
    global num_timers, dm_exclusive, DEFAULT_DURATION, theme
    
    if key == "locked":
        control_state["locked"] = value
    elif key == "adjust_locked":
        control_state["adjust_locked"] = value
    elif key == "DEFAULT_DURATION":
        DEFAULT_DURATION = int(value)
        control_state["DEFAULT_DURATION"] = DEFAULT_DURATION
    elif key == "num_timers":
        num_timers = int(value)
        control_state["num_timers"] = num_timers
        finish_order.clear()
        init_timers()
    elif key == "dm_exclusive":
        dm_exclusive = bool(value)
        control_state["dm_exclusive"] = dm_exclusive
    elif key == "theme":
        theme = value
        control_state["theme"] = theme
    
    save_current_state()
    return control_state

def toggle_hand(timer_id):
    if control_state["locked"]: return
    t = timers[timer_id]
    t["raised_hand"] = not t.get("raised_hand", False)

def set_condition(timer_id, condition):
    timers[timer_id]["condition"] = condition

def toggle_timer(timer_id):
    if control_state["locked"]: return
    t = timers[timer_id]
    if t["remaining"] > 0:
        t["running"] = not t["running"]
        t["last_update"] = time.time()
    else:
        t["running"] = False

def _reset_single(timer_id):
    """Internal helper to reset a single timer by ID avoiding duplicate logic"""
    t = timers[timer_id]
    t["remaining"] = DEFAULT_DURATION
    t["duration"] = DEFAULT_DURATION
    t["running"] = False
    t["last_update"] = time.time()
    t["finished"] = False
    t["raised_hand"] = False
    if timer_id in finish_order:
        finish_order.remove(timer_id)

def reset_timer(timer_id):
    _reset_single(timer_id)

def toggle_all_timers():
    now = time.time()
    any_running = any(t["running"] for t in timers.values())
    for t in timers.values():
        if t["remaining"] > 0:
            t["running"] = not any_running
            t["last_update"] = now
        else:
            t["running"] = False

def reset_all_timers():
    for i in timers.keys():
        _reset_single(i)
    finish_order.clear()

def set_timer(timer_id, seconds):
    t = timers[timer_id]
    t["remaining"] = int(seconds)
    t["duration"] = int(seconds)
    t["running"] = False
    t["last_update"] = time.time()

def adjust_timer(timer_id, delta):
    t = timers[timer_id]
    t["remaining"] = max(0, t["remaining"] + int(delta))
    t["last_update"] = time.time()

def set_timer_name(timer_id, name):
    timers[timer_id]["name"] = name
    save_current_state()

# ==========================================
# ====== BACKGROUND LOOP ===================
# ==========================================

def timer_loop(socketio):
    while True:
        now = time.time()

        for i, t in timers.items():
            if t["running"]:
                elapsed = now - t["last_update"]
                t["remaining"] = max(0, t["remaining"] - elapsed)
                t["last_update"] = now

                if t["remaining"] <= 0 and not t["finished"]:
                    t["remaining"] = 0
                    t["finished"] = True
                    t["running"] = False
                    finish_order.append(i)

        positions = {tid: idx + 1 for idx, tid in enumerate(finish_order)}

        payload = {
            i: {
                **t,
                "position": positions.get(i)
            }
            for i, t in timers.items()
        }

        socketio.emit("update", payload)
        socketio.sleep(0.5)