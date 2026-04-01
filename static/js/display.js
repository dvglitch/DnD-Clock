const socket = io();

let numTimers = 6;
let dmExclusive = false;
let prevTimers = {};
let selectedTimerSound = "synthetic";
let selectedHandSound = "synthetic";

// Audio Controller for reliable playback
const AudioController = {
    timerAudio: null,
    handAudio: null,
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
        const overlay = document.getElementById("audio-unlock-overlay");
        if (overlay) overlay.style.display = "none";
    },

    setTimerSound(sound) {
        if (sound === "synthetic") {
            this.timerAudio = null;
        } else {
            this.timerAudio = new Audio(`/static/sounds/${sound}`);
            this.timerAudio.load();
        }
    },

    setHandSound(sound) {
        if (sound === "synthetic") {
            this.handAudio = null;
        } else {
            this.handAudio = new Audio(`/static/sounds/${sound}`);
            this.handAudio.load();
        }
    },

    play(type) {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        if (type === 'timer') {
            if (this.timerAudio) {
                this.timerAudio.currentTime = 0;
                this.timerAudio.play().catch(e => console.warn(e));
            } else {
                this.playSynthetic('timer');
            }
        } else if (type === 'hand') {
            if (this.handAudio) {
                this.handAudio.currentTime = 0;
                this.handAudio.play().catch(e => console.warn(e));
            } else {
                this.playSynthetic('hand');
            }
        }
    },

    playSynthetic(type) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (type === 'timer') {
            osc.frequency.setValueAtTime(660, this.audioCtx.currentTime); 
            osc.frequency.exponentialRampToValueAtTime(523.25, this.audioCtx.currentTime + 0.1); 
            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.8);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.8);
        } else if (type === 'hand') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); 
            osc.frequency.exponentialRampToValueAtTime(1320, this.audioCtx.currentTime + 0.1); 
            gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.3);
        }
    }
};

// Global click to unlock audio
window.addEventListener('click', () => AudioController.init(), { once: false });

function playSound(type) {
    AudioController.play(type);
}

function formatTime(s) {
    let m = Math.floor(s / 60);
    let sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

socket.on("control_update", (data) => {
    numTimers = data.num_timers || 6;
    dmExclusive = data.dm_exclusive || false;
    
    if (data.theme) {
        document.body.className = `theme-${data.theme} page-display`;
    }
    
    if (data.custom_bg_url !== undefined) {
        applyCustomBg(data.custom_bg_url);
    }

    if (data.timer_done_sound) {
        selectedTimerSound = data.timer_done_sound;
        AudioController.setTimerSound(data.timer_done_sound);
    }

    if (data.hand_raise_sound) {
        selectedHandSound = data.hand_raise_sound;
        AudioController.setHandSound(data.hand_raise_sound);
    }
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

socket.on("update", (data) => {
    // Detect transitions
    Object.keys(data).forEach(id => {
        const t = data[id];
        const pt = prevTimers[id];
        if (pt) {
            // Timer completion check
            if (t.remaining <= 0 && pt.remaining > 0) {
                playSound('timer');
            }
            // Hand raise check
            if (t.raised_hand && !pt.raised_hand) {
                playSound('hand');
            }
        }
    });

    prevTimers = JSON.parse(JSON.stringify(data));
    const container = document.getElementById("timers");

    // Click-to-unlock overlay for Display page
    if (!document.getElementById("audio-unlock-overlay")) {
        const overlay = document.createElement("div");
        overlay.id = "audio-unlock-overlay";
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85);
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            z-index: 9999; cursor: pointer; backdrop-filter: blur(10px);
            color: white; font-family: 'Cinzel', serif;
        `;
        overlay.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 20px; text-shadow: 0 0 20px rgba(255,255,255,0.5);">🔊 Audio Sync Required</div>
            <div style="font-size: 20px; opacity: 0.8;">Click anywhere to enable combat alerts</div>
            <div style="margin-top: 40px; font-size: 14px; opacity: 0.5;">(Satisfies browser security policies)</div>
        `;
        document.body.appendChild(overlay);
    }

    const currentIds = Object.keys(data).map(Number).sort((a,b) => a - b);
    
    if (currentIds.length <= 4) {
        container.style.gridTemplateColumns = "repeat(2, 1fr)";
    } else {
        container.style.gridTemplateColumns = "repeat(3, 1fr)";
    }

    Array.from(container.children).forEach(child => {
        const idNum = Number(child.id.replace("display-timer-", ""));
        if (!currentIds.includes(idNum)) {
            child.remove();
        }
    });

    for (let i of currentIds) {
        const t = data[i];

        let div = document.getElementById(`display-timer-${i}`);

        // Create the card strictly once
        if (!div) {
            div = document.createElement("div");
            div.id = `display-timer-${i}`;
            div.style.cssText = `
                border-radius:15px;
                padding:30px;
                text-align:center;
                font-size:30px;
                position:relative;
                transition: all 0.3s ease, box-shadow 0.3s ease;
            `;

            div.innerHTML = `
                <div id="disp-name-${i}" style="font-size:24px; margin-bottom:10px; text-shadow: 1px 1px 2px black;"></div>
                
                <div id="disp-time-${i}" style="font-size:64px; font-weight:bold; font-variant-numeric: tabular-nums; text-shadow: 2px 2px 4px black; transition: color 0.5s;"></div>
                
                <div id="disp-status-${i}" style="margin-top:10px;"></div>
                
                <div id="disp-order-${i}" style="display:none; margin-top:15px; font-size:28px;"></div>
                
                <div id="disp-cond-container-${i}"></div>

                <!-- Progress Bar -->
                <div style="position:absolute; bottom:0; left:0; right:0; height:12px; background:rgba(0,0,0,0.5); border-radius:0 0 15px 15px; overflow:hidden;">
                    <div id="disp-pb-${i}" style="height:100%; width:100%; background:#4CAF50; transition:width 0.5s linear, background-color 0.5s;"></div>
                </div>
            `;
            container.appendChild(div);
        }

        // Surgical property updates
        let bg = "#444"; 
        if (t.running) bg = "#1e7f3f"; 
        if (t.remaining <= 0) bg = "#a83232"; 

        const pct = Math.max(0, Math.min(100, (t.remaining / t.duration) * 100));
        let pbColor = "#4CAF50"; 
        if (pct <= 50) pbColor = "#f39c12"; 
        if (pct <= 20) pbColor = "#e74c3c"; 

        let boxShadow = "0 4px 10px rgba(0,0,0,0.5)";
        if (t.raised_hand) {
            boxShadow = "inset 0 0 50px 10px rgba(255, 215, 0, 0.5), inset 0 0 20px 5px rgba(255, 215, 0, 0.8), " + boxShadow;
        }

        div.style.background = bg;
        div.style.border = "none";
        div.style.boxShadow = boxShadow;

        document.getElementById(`disp-name-${i}`).innerText = t.name || ("Timer " + i);
        document.getElementById(`disp-time-${i}`).innerText = formatTime(t.remaining);
        document.getElementById(`disp-status-${i}`).innerText = t.running ? "Running" : (t.remaining <= 0 ? "Finished" : "Paused");
        
        const orderDiv = document.getElementById(`disp-order-${i}`);
        if (t.position) {
            orderDiv.innerText = `Order: ${t.position}`;
            orderDiv.style.display = "block";
        } else {
            orderDiv.style.display = "none";
        }
        
        const condContainer = document.getElementById(`disp-cond-container-${i}`);
        if (t.condition) {
            condContainer.innerHTML = `<div style="position:absolute; top:-12px; right:-12px; background:linear-gradient(145deg, #333, #111); color:#fff; padding:6px 16px; border-radius:4px; font-size:22px; font-weight:bold; font-family:'Cinzel', serif; box-shadow:0 6px 12px rgba(0,0,0,0.8); border:2px solid #666; letter-spacing:1px; z-index:10;">${t.condition}</div>`;
        } else {
            condContainer.innerHTML = "";
        }

        const pb = document.getElementById(`disp-pb-${i}`);
        pb.style.width = `${pct}%`;
        pb.style.background = pbColor;
    }
});
