const socket = io("http://" + location.hostname + ":5000");

function formatTime(s) {
    let m = Math.floor(s / 60);
    let sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

let numTimers = 6;
let dmExclusive = false;
let locked = false;
let adjustLocked = false;
                  
socket.on("control_update", (data) => {
    locked = data.locked || false;
    adjustLocked = data.adjust_locked || false;
    numTimers = data.num_timers || 6;
    dmExclusive = data.dm_exclusive || false;
    
    document.getElementById("numTimers").value = numTimers;
    document.getElementById("dmExclusiveToggle").checked = dmExclusive;
    
    if (data.DEFAULT_DURATION !== undefined) {
        document.getElementById("allTime").value = data.DEFAULT_DURATION;
    }

    if (data.theme) {
        document.getElementById("themeSelect").value = data.theme;
        updateThemeClass(data.theme);
    }
    
    updateLockUI();
    updateDmExclusiveUI();
    
    // Remove old timer divs that are beyond numTimers
    for (let i = numTimers + 1; i <= 12; i++) {
        const div = document.getElementById(`timer-${i}`);
        if (div) {
            div.remove();
        }
    }
}); 

function updateThemeClass(themeName) {
    document.body.className = `theme-${themeName} page-control`;
    if (document.body.classList.contains("compact-mode")) {
        document.body.classList.add("compact-mode");
    }
}

socket.on("update", (data) => {
    const container = document.getElementById("timers");
    let anyRunning = false;

    for (let i = 1; i <= numTimers; i++) {
        const t = data[i];
        if (!t) continue; // Skip if timer doesn't exist
        
        if (t.running) anyRunning = true;

        let div = document.getElementById(`timer-${i}`);

        // ✅ Create once
        if (!div) {
            div = document.createElement("div");
            div.id = `timer-${i}`;
            div.style = `
                border-radius:10px;
                padding:20px;
                padding-bottom:30px;
                background:#222;
                box-shadow:0 4px 10px rgba(0,0,0,0.5);
                position:relative;
                overflow:hidden;
            `;

            div.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <!-- Top Row: Name and Condition -->
                    <div style="display:flex; gap:10px;">
                        <input 
                            type="text"
                            id="name-${i}" 
                            placeholder="Timer Name"
                            style="flex:1; min-width:0; box-sizing:border-box; font-weight:bold; font-size:1.1em; margin:0;"
                        >
                        <input 
                            type="text"
                            id="condition-${i}" 
                            placeholder="Condition"
                            style="flex:1; min-width:0; box-sizing:border-box; font-size:1em; margin:0;"
                        >
                    </div>

                    <!-- Time and Status inline -->
                    <div style="display:flex; justify-content:space-between; align-items:stretch; margin:10px 0;">
                        <div style="display:flex; flex-direction:column; justify-content:flex-end;">
                            <div id="time-display-${i}" style="font-size:48px; font-weight:bold; line-height:1; font-variant-numeric: tabular-nums;"></div>
                        </div>
                        <div style="display:flex; align-items:stretch; gap:10px; text-align:right;">
                            <div style="display:flex; flex-direction:column; justify-content:space-evenly; padding:4px 0;">
                                <div id="status-${i}" style="font-size:14px; text-transform:uppercase; letter-spacing:1px; opacity:0.8; line-height:1;"></div>
                                <div id="position-${i}" style="font-size:18px; font-weight:bold; line-height:1; min-height:18px;"></div>
                            </div>
                            <input
                                type="number"
                                id="init-rank-${i}"
                                placeholder="Initiative"
                                title="Initiative (1=First)"
                                style="width:110px; height:auto; box-sizing:border-box; font-size:1.3em; margin:0; padding:4px; text-align:center;"
                            >
                        </div>
                    </div>

                    <!-- Main Controls -->
                    <div style="display:flex; gap:10px;">
                        <button id="toggle-${i}" style="flex:1; margin:0; font-weight:bold;"></button>
                        <button onclick="resetTimer(${i})" style="flex:1; margin:0;">Reset</button>
                    </div>

                    <!-- Adjustments -->
                    <div class="hide-on-compact" style="display:flex; gap:10px;">
                        <button onclick="adjust(${i}, 30)" style="flex:1; margin:0;">+30s</button>
                        <button onclick="adjust(${i}, -30)" style="flex:1; margin:0;">-30s</button>
                    </div>

                    <!-- Set custom time -->
                    <div class="hide-on-compact" style="display:flex; gap:10px;">
                        <input id="time-${i}" type="number" placeholder="Seconds" style="flex:2; margin:0; box-sizing:border-box;">
                        <button onclick="setTimer(${i})" style="flex:1; margin:0;">Set</button>
                    </div>

                    <!-- Progress Bar Container -->
                    <div style="position:absolute; bottom:0; left:0; right:0; height:8px; background:rgba(0,0,0,0.5);">
                        <div id="pb-${i}" style="height:100%; width:100%; background:#4CAF50; transition:width 0.5s linear, background-color 0.5s;"></div>
                    </div>
                </div>
            `;

            container.appendChild(div);

            // attach handlers once
            document.getElementById(`toggle-${i}`).onclick = () => toggle(i);

            document.getElementById(`name-${i}`).onchange = () => {
                const name = document.getElementById(`name-${i}`).value;
                socket.emit("set_name", {timer: i, name});
            };

            document.getElementById(`condition-${i}`).onchange = () => {
                const condition = document.getElementById(`condition-${i}`).value;
                socket.emit("set_condition", {timer: i, condition});
            };
        }

        // ✅ Update name (only if not actively editing)
        const nameInput = document.getElementById(`name-${i}`);
        if (document.activeElement !== nameInput) {
            nameInput.value = t.name;
        }

        // ✅ Update condition (only if not actively editing)
        const condInput = document.getElementById(`condition-${i}`);
        if (condInput && document.activeElement !== condInput) {
            condInput.value = t.condition || "";
        }

        // ✅ Update timer display
        document.getElementById(`time-display-${i}`).innerText = formatTime(t.remaining);
        document.getElementById(`status-${i}`).innerText = t.running ? "Running" : "Paused";

        // ✅ Update position (finish order)
        const posDiv = document.getElementById(`position-${i}`);
        if (t.position) {
            posDiv.innerText = `Order: ${t.position}`;
        } else {
            posDiv.innerText = "";
        }

        // ✅ Update toggle button
        const toggleBtn = document.getElementById(`toggle-${i}`);
        toggleBtn.innerText = t.running ? "Pause" : "Start";

        // ✅ Color states
        let bg = "#333";
        let timerClass = "";
        
        if (t.running) {
            bg = "#1e7f3f";
            timerClass = "timer-running";
        } else if (t.remaining <= 0) {
            bg = "#a83232";
            timerClass = "timer-finished";
        }

        div.style.background = bg;
        div.className = timerClass;

        // ✅ Progress Bar Update
        const pct = Math.max(0, Math.min(100, (t.remaining / t.duration) * 100));
        let pbColor = "#4CAF50"; // Green
        if (pct <= 50) pbColor = "#f39c12"; // Yellow
        if (pct <= 20) pbColor = "#e74c3c"; // Red

        const pb = document.getElementById(`pb-${i}`);
        if (pb) {
            pb.style.width = `${pct}%`;
            pb.style.background = pbColor;
        }
    }

    const toggleAllBtn = document.getElementById("toggleAllBtn");
    if (toggleAllBtn) {
        toggleAllBtn.innerText = anyRunning ? "⏸ Pause All" : "▶ Start All";
    }
});

function toggle(timer) {
    socket.emit("toggle", {timer});
}

function resetTimer(timer) {
    socket.emit("reset", {timer});
}

function setTimer(timer) {
    const input = document.getElementById(`time-${timer}`);
    const seconds = input.value;
    if (!seconds) return;

    socket.emit("set_timer", {timer, seconds});
    input.value = "";
}

function adjust(timer, delta) {
    socket.emit("adjust_timer", {timer, delta});
}

function toggleAll() {
    socket.emit("toggle_all");
}

function resetAll() {
    socket.emit("reset_all");
}

function setAll() {
    const seconds = document.getElementById("allTime").value;
    socket.emit("set_all_time", {seconds});
}

function toggleDmExclusive() {
    const toggle = document.getElementById("dmExclusiveToggle");
    const exclusive = toggle.checked;
    socket.emit("set_dm_exclusive", {exclusive});
}

function changeTheme() {
    const theme = document.getElementById("themeSelect").value;
    socket.emit("set_theme", {theme});
}

// Initial Compact Load
function initializeCompactMode() {
    let compactPref = localStorage.getItem("compactMode");
    // Default to false if not setup
    if (compactPref === null) {
        compactPref = "false";
        localStorage.setItem("compactMode", "false");
    }
    const isCompact = compactPref === "true";
    document.getElementById("compactToggle").checked = isCompact;
    document.body.classList.toggle("compact-mode", isCompact);
    document.getElementById("compactLabel").innerText = isCompact ? "Compact: On" : "Compact: Off";
}

function toggleCompact() {
    const isCompact = document.getElementById("compactToggle").checked;
    localStorage.setItem("compactMode", isCompact);
    document.body.classList.toggle("compact-mode", isCompact);
    document.getElementById("compactLabel").innerText = isCompact ? "Compact: On" : "Compact: Off";
}

initializeCompactMode();

function setNumTimers() {
    const num = document.getElementById("numTimers").value;
    socket.emit("set_num_timers", {num});
}

function updateDmExclusiveUI() {
    const toggle = document.getElementById("dmExclusiveToggle");
    const label = document.getElementById("dmExclusiveLabel");
    
    toggle.checked = dmExclusive;
    
    if (dmExclusive) {
        label.innerText = "On (DM only for last timer)";
    } else {
        label.innerText = "Off (show all timers everywhere)";
    }
}
                  
function toggleLock() {
    const toggle = document.getElementById("lockToggle");
    locked = toggle.checked;

    socket.emit("lock_controls", {locked});
    updateLockUI();
}

function toggleAdjustLock() {
    const toggle = document.getElementById("adjustLockToggle");
    adjustLocked = toggle.checked;

    socket.emit("lock_adjust", {locked: adjustLocked});
    updateLockUI();
}

function updateLockUI() {
    const toggle = document.getElementById("lockToggle");
    const label = document.getElementById("lockLabel");
    const adjustToggle = document.getElementById("adjustLockToggle");
    const adjustLabel = document.getElementById("adjustLockLabel");

    toggle.checked = locked;
    if (adjustToggle) adjustToggle.checked = adjustLocked;

    if (locked) {
        label.innerText = "Master Controls: 🔒 Locked";
    } else {
        label.innerText = "Master Controls: 🔓 Unlocked";
    }

    if (adjustLabel) {
        if (adjustLocked) {
            adjustLabel.innerText = "+-30s Controls: 🔒 Locked";
        } else {
            adjustLabel.innerText = "+-30s Controls: 🔓 Unlocked";
        }
    }
}

function calculateInitiatives() {
    const mode = document.getElementById("initMode").value;
    const intervalStr = document.getElementById("initInterval").value;
    const interval = parseInt(intervalStr) || 30;
    
    const ranks = {};
    for (let i = 1; i <= numTimers; i++) {
        const val = document.getElementById(`init-rank-${i}`)?.value;
        if (val) {
            ranks[i] = parseInt(val);
        }
    }
    
    if (Object.keys(ranks).length === 0) {
        alert("Please assign an Initiative order (1, 2, 3...) to at least one timer.");
        return;
    }
    
    socket.emit("calculate_initiatives", { mode, interval, ranks });
}
