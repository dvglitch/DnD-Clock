import time
from persistence import load_settings, save_settings

# Load settings from persistence
settings = load_settings()

# Dynamic configuration
dm_exclusive = settings.get("dm_exclusive", False)
locked = settings.get("locked", False)
adjust_locked = settings.get("adjust_locked", False)
DEFAULT_DURATION = settings.get("DEFAULT_DURATION", 180)
theme = settings.get("theme", "tavern")
custom_bg_url = settings.get("custom_bg_url", "")

max_timer_id = settings.get("max_timer_id", 6)
active_timer_ids = settings.get("active_timer_ids", list(range(1, max_timer_id + 1)))

# Timer state (will be populated dynamically)
timers = {}
finish_order = []

control_state = {
    "locked": locked,
    "adjust_locked": adjust_locked,
    "dm_exclusive": dm_exclusive,
    "DEFAULT_DURATION": DEFAULT_DURATION,
    "theme": theme,
    "custom_bg_url": custom_bg_url
}

def init_timers():
    """Initialize timers based on active_timer_ids setting"""
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
        for i in active_timer_ids
    }
    finish_order = []

# Initialize timers on startup
init_timers()

def save_current_state():
    """Saves the current variables down to the persistence layer"""
    settings = {
        "max_timer_id": max_timer_id,
        "active_timer_ids": active_timer_ids,
        "dm_exclusive": dm_exclusive,
        "locked": control_state["locked"],
        "adjust_locked": control_state.get("adjust_locked", False),
        "DEFAULT_DURATION": DEFAULT_DURATION,
        "timer_names": {str(k): v["name"] for k, v in timers.items()},
        "theme": theme,
        "custom_bg_url": custom_bg_url
    }
    save_settings(settings)

# ==========================================
# ====== STATE MUTATION APIS ===============
# ==========================================

def update_control_state(key, value):
    """Updates a global control variable, syncs state, and persists."""
    global dm_exclusive, DEFAULT_DURATION, theme, custom_bg_url
    
    if key == "locked":
        control_state["locked"] = value
    elif key == "adjust_locked":
        control_state["adjust_locked"] = value
    elif key == "DEFAULT_DURATION":
        DEFAULT_DURATION = int(value)
        control_state["DEFAULT_DURATION"] = DEFAULT_DURATION
    elif key == "dm_exclusive":
        dm_exclusive = bool(value)
        control_state["dm_exclusive"] = dm_exclusive
    elif key == "theme":
        theme = value
        control_state["theme"] = theme
    elif key == "custom_bg_url":
        custom_bg_url = value
        control_state["custom_bg_url"] = custom_bg_url
    
    save_current_state()
    return control_state

def add_timer():
    global max_timer_id, active_timer_ids
    
    new_id = 1
    while new_id in active_timer_ids:
        new_id += 1
        
    if new_id > max_timer_id:
        max_timer_id = new_id
        
    active_timer_ids.append(new_id)
    timers[new_id] = {
        "remaining": DEFAULT_DURATION,
        "running": False,
        "last_update": time.time(),
        "name": f"Timer {new_id}",
        "finished": False,
        "raised_hand": False,
        "condition": "",
        "duration": DEFAULT_DURATION
    }
    save_current_state()
    return new_id

def delete_timer(timer_id):
    if timer_id in timers:
        del timers[timer_id]
    if timer_id in active_timer_ids:
        active_timer_ids.remove(timer_id)
    if timer_id in finish_order:
        finish_order.remove(timer_id)
    save_current_state()

def toggle_hand(timer_id):
    if control_state["locked"]: return
    if timer_id not in timers: return
    t = timers[timer_id]
    t["raised_hand"] = not t.get("raised_hand", False)

def set_condition(timer_id, condition):
    if timer_id not in timers: return
    timers[timer_id]["condition"] = condition

def toggle_timer(timer_id):
    if control_state["locked"]: return
    if timer_id not in timers: return
    t = timers[timer_id]
    if t["remaining"] > 0:
        t["running"] = not t["running"]
        t["last_update"] = time.time()
    else:
        t["running"] = False

def _reset_single(timer_id):
    """Internal helper to reset a single timer by ID avoiding duplicate logic"""
    if timer_id not in timers: return
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
    if timer_id not in timers: return
    t = timers[timer_id]
    t["remaining"] = int(seconds)
    t["duration"] = int(seconds)
    t["running"] = False
    t["last_update"] = time.time()

def adjust_timer(timer_id, delta):
    if timer_id not in timers: return
    t = timers[timer_id]
    t["remaining"] = max(0, t["remaining"] + int(delta))
    t["last_update"] = time.time()

def set_timer_name(timer_id, name):
    if timer_id not in timers: return
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
                    if i not in finish_order:
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