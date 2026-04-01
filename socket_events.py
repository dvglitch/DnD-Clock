import timers as tm
import game_logic as gl

def register_socket_events(socketio):

    @socketio.on("toggle_hand")
    def toggle_hand(data):
        tm.toggle_hand(int(data["timer"]))

    @socketio.on("set_condition")
    def set_condition(data):
        tm.set_condition(int(data["timer"]), data["condition"])

    @socketio.on("toggle")
    def toggle(data):
        tm.toggle_timer(int(data["timer"]))

    @socketio.on("reset")
    def reset(data):
        tm.reset_timer(int(data["timer"]))

    @socketio.on("toggle_all")
    def toggle_all():
        tm.toggle_all_timers()

    @socketio.on("reset_all")
    def reset_all():
        tm.reset_all_timers()

    @socketio.on("set_all_time")
    def set_all_time(data):
        new_state = tm.update_control_state("DEFAULT_DURATION", data["seconds"])
        socketio.emit("control_update", new_state)

    @socketio.on("set_timer")
    def set_timer(data):
        tm.set_timer(int(data["timer"]), data["seconds"])

    @socketio.on("lock_controls")
    def lock_controls(data):
        new_state = tm.update_control_state("locked", data["locked"])
        socketio.emit("control_update", new_state)

    @socketio.on("lock_adjust")
    def lock_adjust(data):
        new_state = tm.update_control_state("adjust_locked", data["locked"])
        socketio.emit("control_update", new_state)

    @socketio.on("set_adjust_interval")
    def set_adjust_interval(data):
        new_state = tm.update_control_state("adjust_interval", data["interval"])
        socketio.emit("control_update", new_state)

    @socketio.on("connect")
    def send_control_state():
        socketio.emit("control_update", tm.control_state)

    @socketio.on("adjust_timer")
    def adjust_timer(data):
        tm.adjust_timer(int(data["timer"]), data["delta"])

    @socketio.on("set_name")
    def set_name(data):
        tm.set_timer_name(int(data["timer"]), data["name"])

    @socketio.on("add_timer")
    def add_timer():
        tm.add_timer()

    @socketio.on("delete_timer")
    def delete_timer(data):
        tm.delete_timer(int(data["timer"]))

    @socketio.on("set_timer_visibility")
    def set_timer_visibility(data):
        tm.set_timer_visibility(int(data["timer"]), data["show_on_remote"])

    @socketio.on("set_theme")
    def set_theme(data):
        new_state = tm.update_control_state("theme", data["theme"])
        socketio.emit("control_update", new_state)
        
    @socketio.on("set_custom_bg_url")
    def set_custom_bg_url(data):
        new_state = tm.update_control_state("custom_bg_url", data["url"])
        socketio.emit("control_update", new_state)

    @socketio.on("set_timer_done_sound")
    def set_timer_done_sound(data):
        new_state = tm.update_control_state("timer_done_sound", data["sound"])
        socketio.emit("control_update", new_state)

    @socketio.on("set_hand_raise_sound")
    def set_hand_raise_sound(data):
        new_state = tm.update_control_state("hand_raise_sound", data["sound"])
        socketio.emit("control_update", new_state)

    @socketio.on("calculate_initiatives")
    def calculate_initiatives(data):
        mode = data.get("mode", "proportional")
        interval = data.get("interval", 30)
        ranks = data.get("ranks", {})
        
        updated_state = gl.calculate_initiatives(mode, interval, ranks)
        if updated_state:
            socketio.emit("control_update", updated_state)