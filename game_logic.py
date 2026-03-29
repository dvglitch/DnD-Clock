import time
import timers as tm

def calculate_initiatives(mode, interval, ranks):
    """Business logic for initiative sorting and math"""
    if not ranks:
        return None
        
    valid_ranks = {int(k): int(v) for k, v in ranks.items() if int(k) in tm.timers}
    if not valid_ranks:
        return None
        
    max_rank = max(valid_ranks.values())
    min_rank = min(valid_ranks.values())
    
    control_updated = False
    if mode == "interval":
        new_max_time = (max_rank - min_rank) * interval if max_rank > min_rank else 0
        if new_max_time > 0:
            tm.DEFAULT_DURATION = new_max_time
            tm.control_state["DEFAULT_DURATION"] = tm.DEFAULT_DURATION
            control_updated = True
            
    now = time.time()
    for k_int, rank in valid_ranks.items():
        t = tm.timers[k_int]
        if mode == "proportional":
            if max_rank > min_rank:
                time_val = (rank - min_rank) / (max_rank - min_rank) * tm.DEFAULT_DURATION
            else:
                time_val = 0
        else:
            time_val = (rank - min_rank) * interval
            
        t["remaining"] = int(time_val)
        t["duration"] = tm.DEFAULT_DURATION
        t["running"] = False
        t["last_update"] = now
        t["finished"] = False
        
        if k_int in tm.finish_order:
            tm.finish_order.remove(k_int)
            
    tm.save_current_state()
    return tm.control_state if control_updated else None
