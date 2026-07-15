import time
from persistence import load_settings, save_settings

# Load settings from persistence
settings = load_settings()

# Dynamic configuration
locked = settings.get("locked", False)
adjust_locked = settings.get("adjust_locked", False)
adjust_interval = settings.get("adjust_interval", 30)
DEFAULT_DURATION = settings.get("DEFAULT_DURATION", 180)
theme = settings.get("theme", "tavern")
custom_bg_url = settings.get("custom_bg_url", "")
timer_done_sound = settings.get("timer_done_sound", "synthetic")
hand_raise_sound = settings.get("hand_raise_sound", "synthetic")
cooldown_mode = settings.get("cooldown_mode", False)

max_timer_id = settings.get("max_timer_id", 6)
active_timer_ids = settings.get("active_timer_ids", list(range(1, max_timer_id + 1)))

# Timer state (will be populated dynamically)
timers = {}
finish_order = []

control_state = {
    "locked": locked,
    "adjust_locked": adjust_locked,
    "adjust_interval": adjust_interval,
    "DEFAULT_DURATION": DEFAULT_DURATION,
    "theme": theme,
    "custom_bg_url": custom_bg_url,
    "timer_done_sound": timer_done_sound,
    "hand_raise_sound": hand_raise_sound,
    "cooldown_mode": cooldown_mode
}

def init_timers():
    """Initialize timers based on active_timer_ids setting"""
    global timers, finish_order
    settings = load_settings()
    timer_vis = settings.get("timer_show_on_remote", {})
    timer_durs = settings.get("timer_durations", {})
    timer_cooldown_durs = settings.get("timer_cooldown_durations", {})
    timers = {
        i: {
            "remaining": int(timer_durs.get(str(i), DEFAULT_DURATION)),
            "running": False,
            "last_update": time.time(),
            "name": settings.get("timer_names", {}).get(str(i), f"Timer {i}"),
            "finished": False,
            "raised_hand": False,
            "condition": "",
            "duration": int(timer_cooldown_durs.get(str(i), timer_durs.get(str(i), DEFAULT_DURATION))) if control_state.get("cooldown_mode", False) else int(DEFAULT_DURATION),
            "cooldown_duration": int(timer_cooldown_durs.get(str(i), timer_durs.get(str(i), DEFAULT_DURATION))),
            "show_on_remote": timer_vis.get(str(i), True)
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
        "locked": control_state["locked"],
        "adjust_locked": control_state.get("adjust_locked", False),
        "adjust_interval": control_state.get("adjust_interval", 30),
        "DEFAULT_DURATION": DEFAULT_DURATION,
        "cooldown_mode": control_state.get("cooldown_mode", False),
        "timer_durations": {str(k): v["duration"] for k, v in timers.items()},
        "timer_cooldown_durations": {str(k): v.get("cooldown_duration", v["duration"]) for k, v in timers.items()},
        "timer_names": {str(k): v["name"] for k, v in timers.items()},
        "timer_show_on_remote": {str(k): v.get("show_on_remote", True) for k, v in timers.items()},
        "theme": theme,
        "custom_bg_url": custom_bg_url,
        "timer_done_sound": control_state.get("timer_done_sound", "synthetic"),
        "hand_raise_sound": control_state.get("hand_raise_sound", "synthetic")
    }
    save_settings(settings)

# ==========================================
# ====== STATE MUTATION APIS ===============
# ==========================================

def update_control_state(key, value):
    """Updates a global control variable, syncs state, and persists."""
    global DEFAULT_DURATION, theme, custom_bg_url, adjust_interval, timer_done_sound, hand_raise_sound
    
    if key == "locked":
        control_state["locked"] = value
    elif key == "adjust_locked":
        control_state["adjust_locked"] = value
    elif key == "adjust_interval":
        adjust_interval = int(value)
        control_state["adjust_interval"] = adjust_interval
    elif key == "DEFAULT_DURATION":
        DEFAULT_DURATION = int(value)
        control_state["DEFAULT_DURATION"] = DEFAULT_DURATION
        # In timer mode, pressing Set should reset all timer defaults to the universal value.
        if not control_state.get("cooldown_mode", False):
            for t in timers.values():
                t["duration"] = DEFAULT_DURATION
    elif key == "theme":
        theme = value
        control_state["theme"] = theme
    elif key == "custom_bg_url":
        custom_bg_url = value
        control_state["custom_bg_url"] = custom_bg_url
    elif key == "timer_done_sound":
        timer_done_sound = value
        control_state["timer_done_sound"] = timer_done_sound
    elif key == "hand_raise_sound":
        hand_raise_sound = value
        control_state["hand_raise_sound"] = hand_raise_sound
    elif key == "cooldown_mode":
        control_state["cooldown_mode"] = bool(value)
        # Swap visible/editable duration values by mode while preserving cooldown-specific defaults.
        if control_state["cooldown_mode"]:
            for t in timers.values():
                t["duration"] = int(t.get("cooldown_duration", t.get("duration", DEFAULT_DURATION)))
        else:
            for t in timers.values():
                t["duration"] = int(DEFAULT_DURATION)
    
    save_current_state()
    return control_state

def set_timer_duration(timer_id, duration):
    if timer_id not in timers: return
    timers[timer_id]["duration"] = int(duration)
    if control_state.get("cooldown_mode", False):
        timers[timer_id]["cooldown_duration"] = int(duration)
    save_current_state()

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
        "duration": DEFAULT_DURATION if not control_state.get("cooldown_mode", False) else DEFAULT_DURATION,
        "cooldown_duration": DEFAULT_DURATION,
        "show_on_remote": True
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

def _reset_single(timer_id, start=False):
    """Internal helper to reset a single timer by ID avoiding duplicate logic"""
    if timer_id not in timers: return
    t = timers[timer_id]
    
    if control_state.get("cooldown_mode", False):
        t["remaining"] = t["duration"]
        t["running"] = bool(start)
    else:
        # In timer mode, each timer can override universal default duration.
        t["remaining"] = t["duration"]
        t["running"] = False
        
    t["last_update"] = time.time()
    t["finished"] = False
    t["raised_hand"] = False
    if timer_id in finish_order:
        finish_order.remove(timer_id)

def reset_timer(timer_id, start=False):
    _reset_single(timer_id, start=start)

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
    if control_state.get("cooldown_mode", False):
        t["cooldown_duration"] = int(seconds)
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

def set_timer_visibility(timer_id, show_on_remote):
    if timer_id not in timers: return
    timers[timer_id]["show_on_remote"] = bool(show_on_remote)
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