import time
import timers as tm
from persistence import save_settings

def register_socket_events(socketio):
    def save_current_state():
        settings = {
            "num_timers": tm.num_timers,
            "dm_exclusive": tm.dm_exclusive,
            "locked": tm.control_state["locked"],
            "adjust_locked": tm.control_state.get("adjust_locked", False),
            "DEFAULT_DURATION": tm.DEFAULT_DURATION,
            "timer_names": {str(k): v["name"] for k, v in tm.timers.items()},
            "theme": tm.theme
        }
        save_settings(settings)

    @socketio.on("toggle_hand")
    def toggle_hand(data):
        if tm.control_state["locked"]:
            return
        t = tm.timers[data["timer"]]
        t["raised_hand"] = not t.get("raised_hand", False)

    @socketio.on("set_condition")
    def set_condition(data):
        tm.timers[data["timer"]]["condition"] = data["condition"]

    @socketio.on("toggle")
    def toggle(data):
        if tm.control_state["locked"]:
            return

        t = tm.timers[data["timer"]]
        if t["remaining"] > 0:
            t["running"] = not t["running"]
            t["last_update"] = time.time()
        else:
            t["running"] = False

    @socketio.on("reset")
    def reset(data):
        i = data["timer"]
        t = tm.timers[i]

        t["remaining"] = tm.DEFAULT_DURATION
        t["duration"] = tm.DEFAULT_DURATION
        t["running"] = False
        t["last_update"] = time.time()
        t["finished"] = False
        t["raised_hand"] = False

        if i in tm.finish_order:
            tm.finish_order.remove(i)

    @socketio.on("toggle_all")
    def toggle_all():
        now = time.time()
        any_running = any(t["running"] for t in tm.timers.values())

        for t in tm.timers.values():
            if t["remaining"] > 0:
                t["running"] = not any_running
                t["last_update"] = now
            else:
                t["running"] = False


    @socketio.on("reset_all")
    def reset_all():
        for t in tm.timers.values():
            t["remaining"] = tm.DEFAULT_DURATION
            t["duration"] = tm.DEFAULT_DURATION
            t["running"] = False
            t["last_update"] = time.time()
            t["finished"] = False
            t["raised_hand"] = False
        
        tm.finish_order.clear()


    @socketio.on("set_all_time")
    def set_all_time(data):
        tm.DEFAULT_DURATION = int(data["seconds"])
        tm.control_state["DEFAULT_DURATION"] = tm.DEFAULT_DURATION
        socketio.emit("control_update", tm.control_state)
        save_current_state()


    @socketio.on("set_timer")
    def set_timer(data):
        t = tm.timers[data["timer"]]
        t["remaining"] = int(data["seconds"])
        t["duration"] = int(data["seconds"])
        t["running"] = False
        t["last_update"] = time.time()


    @socketio.on("lock_controls")
    def lock_controls(data):
        tm.control_state["locked"] = data["locked"]
        socketio.emit("control_update", tm.control_state)
        save_current_state()

    @socketio.on("lock_adjust")
    def lock_adjust(data):
        tm.control_state["adjust_locked"] = data["locked"]
        socketio.emit("control_update", tm.control_state)
        save_current_state()

    @socketio.on("connect")
    def send_control_state():
        socketio.emit("control_update", tm.control_state)

    @socketio.on("adjust_timer")
    def adjust_timer(data):
        t = tm.timers[data["timer"]]
        t["remaining"] = max(0, t["remaining"] + int(data["delta"]))
        t["last_update"] = time.time()

    @socketio.on("set_name")
    def set_name(data):
        tm.timers[data["timer"]]["name"] = data["name"]
        save_current_state()

    @socketio.on("set_num_timers")
    def set_num_timers(data):
        tm.num_timers = int(data["num"])
        tm.control_state["num_timers"] = tm.num_timers
        tm.finish_order.clear()
        tm.init_timers()
        socketio.emit("control_update", tm.control_state)
        save_current_state()

    @socketio.on("set_dm_exclusive")
    def set_dm_exclusive(data):
        tm.dm_exclusive = bool(data["exclusive"])
        tm.control_state["dm_exclusive"] = tm.dm_exclusive
        socketio.emit("control_update", tm.control_state)
        save_current_state()

    @socketio.on("set_theme")
    def set_theme(data):
        tm.theme = data["theme"]
        tm.control_state["theme"] = tm.theme
        socketio.emit("control_update", tm.control_state)
        save_current_state()

    @socketio.on("calculate_initiatives")
    def calculate_initiatives(data):
        mode = data.get("mode", "proportional")
        interval = data.get("interval", 30)
        ranks = data.get("ranks", {})  # e.g., { "1": 2, "2": 1, ... }
        
        if not ranks:
            return
            
        valid_ranks = {int(k): int(v) for k, v in ranks.items() if int(k) in tm.timers}
        if not valid_ranks:
            return
            
        max_rank = max(valid_ranks.values())
        min_rank = min(valid_ranks.values())
        
        if mode == "interval":
            new_max_time = (max_rank - min_rank) * interval if max_rank > min_rank else 0
            if new_max_time > 0:
                tm.DEFAULT_DURATION = new_max_time
                tm.control_state["DEFAULT_DURATION"] = tm.DEFAULT_DURATION
                socketio.emit("control_update", tm.control_state)
                
        now = time.time()
        
        for k_int, rank in valid_ranks.items():
            t = tm.timers[k_int]
            
            if mode == "proportional":
                if max_rank > min_rank:
                    time_val = (rank - min_rank) / (max_rank - min_rank) * tm.DEFAULT_DURATION
                else:
                    time_val = 0
            else: # interval
                time_val = (rank - min_rank) * interval
                
            t["remaining"] = int(time_val)
            t["duration"] = tm.DEFAULT_DURATION
            t["running"] = False
            t["last_update"] = now
            t["finished"] = False
            
            # also remove from finish order just in case
            if k_int in tm.finish_order:
                tm.finish_order.remove(k_int)
                
        save_current_state()