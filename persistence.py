import json
import os

SETTINGS_FILE = "settings.json"

DEFAULT_SETTINGS = {
    "num_timers": 6,
    "dm_exclusive": False,
    "locked": False,
    "adjust_locked": False,
    "DEFAULT_DURATION": 180,
    "timer_names": {}
}

def load_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                settings = json.load(f)
                
                # Merge with defaults in case new settings are added
                merged = DEFAULT_SETTINGS.copy()
                merged.update(settings)
                return merged
        except Exception as e:
            print(f"Error loading settings: {e}")
            return DEFAULT_SETTINGS.copy()
    return DEFAULT_SETTINGS.copy()

def save_settings(settings):
    try:
        with open(SETTINGS_FILE, "w") as f:
            json.dump(settings, f, indent=4)
    except Exception as e:
        print(f"Error saving settings: {e}")
