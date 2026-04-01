const socket = io();

let timers = {};
let expanded = null;
let locked = false;
let adjustLocked = false;
let numTimers = 6;
let adjustInterval = 30;

function formatTime(s) {
    let m = Math.floor(s / 60);
    let sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

socket.on("update", (data) => {
    timers = data;
    renderTimers();
});

socket.on("control_update", (data) => {
    locked = data.locked;
    adjustLocked = data.adjust_locked || false;
    adjustInterval = data.adjust_interval || 30;
    numTimers = data.num_timers || 6;
    
    if (data.theme) {
        document.body.className = `theme-${data.theme} page-remote`;
    }
    
    if (data.custom_bg_url !== undefined) {
        applyCustomBg(data.custom_bg_url);
    }

    document.body.style.opacity = locked ? 0.5 : 1;
    renderTimers();
});

function applyCustomBg(url) {
    if (url && url.trim() !== "") {
        document.body.style.backgroundImage = `url('${url}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
    } else {
        document.body.style.backgroundImage = "";
    }
}

function toggleExpand(i) {
    // If touching the already expanded tab, collapse it
    if (expanded === i) {
        expanded = null;
    } else {
        expanded = i;
    }
    renderTimers();
}

function renderTimers() {
    const container = document.getElementById("timers");
    let ids = Object.keys(timers)
        .map(Number)
        .sort((a, b) => a - b)
        .filter(id => timers[id] && timers[id].show_on_remote === false); // <=== CHANGED THIS LINE FOR DM EXCLUSIVE

    // Remove timers that are no longer in the list or hidden due to focus mode
    Array.from(container.children).forEach(child => {
        const idNum = Number(child.id.replace("timer-card-", ""));
        if (!ids.includes(idNum) || (expanded !== null && expanded !== idNum)) {
            child.remove();
        }
    });

    for (let i of ids) {
        const t = timers[i];
        if (!t) continue;

        const isExp = (expanded === i);
        
        // Focus Mode: Hide all other timers if one is expanded
        if (expanded !== null && !isExp) continue;

        let cardClass = "timer-card";
        if (t.running) cardClass += " running";
        if (t.remaining <= 0) cardClass += " finished";
        
        const timeStr = formatTime(t.remaining);

        let card = document.getElementById(`timer-card-${i}`);
        let currentState = card ? card.getAttribute("data-expanded") === "true" : null;

        if (!card || currentState !== isExp) {
            if (card) card.remove();
            card = document.createElement("div");
            card.id = `timer-card-${i}`;
            card.setAttribute("data-expanded", isExp);
            container.appendChild(card);

            let html = `
                <div class="timer-header" onclick="toggleExpand(${i})">
                    <div class="name-disp" style="font-size:22px; text-shadow:1px 1px 2px black;">${t.name}</div>
                    <div class="time-disp" style="font-size:26px; font-variant-numeric: tabular-nums; text-shadow:1px 1px 2px black;"></div>
                </div>
            `;

            if (isExp) {
                html += `
                    <div class="timer-body">
                        <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:16px;">
                            <div class="status-disp" style="opacity:0.8; text-transform:uppercase;"></div>
                            <div class="pos-disp" style="font-weight:bold;"></div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                            <button class="toggle-btn" onclick="toggle(${i})" style="margin:0; width:100%; border:1px solid rgba(255,255,255,0.2); box-sizing:border-box;"></button>
                            <button onclick="reset(${i})" style="margin:0; width:100%; border:1px solid rgba(255,255,255,0.2); box-sizing:border-box;">Reset</button>
                        </div>
                        <div style="display:flex; width:100%; margin-bottom:10px;">
                            <button class="hand-btn" onclick="toggleHand(${i})" style="flex:1; margin:0; border:1px solid rgba(255,215,0,0.5); background:rgba(218,165,32,0.2); color:gold; box-sizing:border-box;"></button>
                        </div>
                        <div class="adj-container" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                            <button id="adj-up-btn-${i}" class="adj-btn" style="margin:0; width:100%; background:#444; box-sizing:border-box;">+30s</button>
                            <button id="adj-down-btn-${i}" class="adj-btn" style="margin:0; width:100%; background:#444; box-sizing:border-box;">-30s</button>
                        </div>
                        <div style="display:flex; width:100%;">
                            <button onclick="toggleExpand(${i})" style="flex:1; margin:0; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.4); box-sizing:border-box;">⬇ Back to List</button>
                        </div>
                    </div>
                `;
            }
            
            card.innerHTML = html;
        }

        // Surgical updates
        card.className = cardClass;
        card.querySelector('.name-disp').textContent = t.name;
        card.querySelector('.time-disp').textContent = timeStr;

        if (isExp) {
            const status = t.remaining <= 0 ? "Finished" : (t.running ? "Running" : "Paused");
            const pos = t.position ? `Order: ${t.position}` : "";
            const toggleTxt = t.running ? "Pause" : "Start";
            const handTxt = t.raised_hand ? "Lower Hand" : "Raise Hand";
            const adOpc = locked ? "0.5" : "1";
            const adjDisplay = adjustLocked ? "none" : "grid";

            card.querySelector('.status-disp').textContent = status;
            card.querySelector('.pos-disp').textContent = pos;
            card.querySelector('.toggle-btn').textContent = toggleTxt;
            card.querySelector('.hand-btn').textContent = handTxt;
            
            let adjContainer = card.querySelector('.adj-container');
            if (adjContainer) adjContainer.style.display = adjDisplay;
            
            card.querySelectorAll('.adj-btn').forEach(btn => {
                btn.style.opacity = adOpc;
            });

            const adjUp = document.getElementById(`adj-up-btn-${i}`);
            if (adjUp) {
                adjUp.onclick = () => adjust(i, adjustInterval);
                adjUp.textContent = `+${adjustInterval}s`;
            }
            const adjDown = document.getElementById(`adj-down-btn-${i}`);
            if (adjDown) {
                adjDown.onclick = () => adjust(i, -adjustInterval);
                adjDown.textContent = `-${adjustInterval}s`;
            }
        }
    }
    
    // Ensure order in DOM matches ids array
    let currentDOMIds = Array.from(container.children).map(child => Number(child.id.replace("timer-card-", "")));
    let matching = true;
    let visibleIds = ids.filter(id => expanded === null || expanded === id);
    if (currentDOMIds.length === visibleIds.length) {
        for(let k=0; k<visibleIds.length; k++) {
            if(currentDOMIds[k] !== visibleIds[k]) {
                matching = false; 
                break;
            }
        }
    } else {
        matching = false;
    }
    
    if (!matching) {
        visibleIds.forEach(id => {
            let c = document.getElementById(`timer-card-${id}`);
            if(c) container.appendChild(c);
        });
    }
}

function toggle(i) {
    // Prevent bubbling of click event resolving multiple tabs breaking
    event.stopPropagation();
    if (locked) return;
    socket.emit("toggle", {timer: i});
}

function reset(i) {
    event.stopPropagation();
    if (locked) return;
    socket.emit("reset", {timer: i});
}

function toggleHand(i) {
    event.stopPropagation();
    if (locked) return;
    socket.emit("toggle_hand", {timer: i});
}

function adjust(i, delta) {
    event.stopPropagation();
    if (locked || adjustLocked) return;
    socket.emit("adjust_timer", {timer: i, delta});
}
