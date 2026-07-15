const socket = io();

let timers = {};
let expanded = null;
let locked = false;
let adjustLocked = false;
let numTimers = 6;
let adjustInterval = 30;

let prevTimers = {};
let muteFeedback = localStorage.getItem("mute_dm_feedback") === "true";
let selectedTimerSound = "synthetic";

// Audio Controller for reliable playback
const AudioController = {
    timerAudio: null,
    audioCtx: null,
    unlocked: false,

    init() {
        if (this.unlocked) return;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        this.unlocked = true;
        console.log("Audio system unlocked");
        this.updateUnlockUI();
    },

    setTimerSound(sound) {
        if (sound === "synthetic") {
            this.timerAudio = null;
        } else {
            this.timerAudio = new Audio(`/static/sounds/${sound}`);
            this.timerAudio.load(); // Pre-load
        }
    },

    play(type) {
        if (type === 'timer' && navigator.vibrate) {
            navigator.vibrate(200);
        }

        if (muteFeedback) return;
        this.init(); // Ensure initialized on first play if not already

        if (type === 'timer') {
            if (this.timerAudio) {
                this.timerAudio.currentTime = 0;
                this.timerAudio.play().catch(e => console.warn("Audio play failed:", e));
            } else {
                this.playSyntheticTimer();
            }
        }
    },

    playSyntheticTimer() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.frequency.setValueAtTime(660, this.audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(523.25, this.audioCtx.currentTime + 0.1); 
        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.8);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.8);
    },

    updateUnlockUI() {
        const indicator = document.getElementById("audio-status");
        if (indicator) {
            let statusText = this.unlocked ? "🟢 Audio Ready" : "🔴 Click to Sync Audio";
            const hapticStatus = navigator.vibrate ? "📱 Haptics: ✅ Ready" : "📱 Haptics: ❌ Unsupported";
            indicator.innerHTML = `${statusText}<br><span style="font-size:10px; opacity:0.7;">${hapticStatus}</span>`;
            indicator.style.color = this.unlocked ? "#4CAF50" : "#ff4444";
        }
    }
};

// Global click to unlock audio
window.addEventListener('click', () => AudioController.init(), { once: false });

// Feedback sound and haptics (legacy wrapper)
function playFeedback(type) {
    AudioController.play(type);
}

function toggleMute() {
    muteFeedback = !muteFeedback;
    localStorage.setItem("mute_dm_feedback", muteFeedback);
    const btn = document.getElementById("mute-btn");
    if (btn) btn.innerText = muteFeedback ? "🔇 Muted" : "🔔 Alerts On";
}

function formatTime(s) {
    let m = Math.floor(s / 60);
    let sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

socket.on("update", (data) => {
    // Check for expanded timer completion
    if (expanded !== null && data[expanded] && prevTimers[expanded]) {
        const t = data[expanded];
        const pt = prevTimers[expanded];
        if (t.remaining <= 0 && pt.remaining > 0) {
            playFeedback('timer');
        }
    }
    timers = data;
    prevTimers = JSON.parse(JSON.stringify(data)); // Deep copy to prevent reference issues
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

    if (data.timer_done_sound) {
        selectedTimerSound = data.timer_done_sound;
        AudioController.setTimerSound(data.timer_done_sound);
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

    // Feedback Toggle Header
    let settingsBar = document.getElementById("feedback-settings");
    if (!settingsBar) {
        settingsBar = document.createElement("div");
        settingsBar.id = "feedback-settings";
        settingsBar.style = "display:flex; justify-content:space-between; align-items:center; padding:0 10px 10px 10px; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1);";
        settingsBar.innerHTML = `
            <div id="audio-status" style="font-size:11px; font-weight:bold; color:#ff4444; opacity:0.8;">🔴 Click to Sync Audio</div>
            <button id="mute-btn" onclick="toggleMute()" style="font-size:12px; padding:5px 12px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.2); border-radius:15px; color:white; cursor:pointer; width:auto; margin:0;">
                ${muteFeedback ? "🔇 Muted" : "🔔 Alerts On"}
            </button>
        `;
        container.parentElement.insertBefore(settingsBar, container);
        AudioController.updateUnlockUI();
    }

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
                            <button class="toggle-btn" onclick="toggle(event, ${i})" style="margin:0; width:100%; border:1px solid rgba(255,255,255,0.2); box-sizing:border-box;"></button>
                            <button onclick="reset(event, ${i})" style="margin:0; width:100%; border:1px solid rgba(255,255,255,0.2); box-sizing:border-box;">Reset</button>
                        </div>
                        <div style="display:flex; width:100%; margin-bottom:10px;">
                            <button class="hand-btn" onclick="toggleHand(event, ${i})" style="flex:1; margin:0; border:1px solid rgba(255,215,0,0.5); background:rgba(218,165,32,0.2); color:gold; box-sizing:border-box;"></button>
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
                adjUp.onclick = (e) => adjust(e, i, adjustInterval);
                adjUp.textContent = `+${adjustInterval}s`;
            }
            const adjDown = document.getElementById(`adj-down-btn-${i}`);
            if (adjDown) {
                adjDown.onclick = (e) => adjust(e, i, -adjustInterval);
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

function toggle(e, i) {
    // Prevent bubbling of click event resolving multiple tabs breaking
    e.stopPropagation();
    if (locked) return;
    socket.emit("toggle", {timer: i});
}

function reset(e, i) {
    e.stopPropagation();
    if (locked) return;
    socket.emit("reset", {timer: i, start: true});
}

function toggleHand(e, i) {
    e.stopPropagation();
    if (locked) return;
    socket.emit("toggle_hand", {timer: i});
}

function adjust(e, i, delta) {
    e.stopPropagation();
    if (locked || adjustLocked) return;
    socket.emit("adjust_timer", {timer: i, delta});
}
