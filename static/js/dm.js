const socket = io();

let TIMER_ID = null; // 👈 admin timer

let timers = {};
let locked = false;
let numTimers = 6;
let dmExclusive = false;

function formatTime(s) {
    let m = Math.floor(s / 60);
    let sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

socket.on("update", (data) => {
    timers = data;

    // ✅ dynamically find last timer
    TIMER_ID = Math.max(...Object.keys(timers).map(Number));

    render();
});

socket.on("control_update", (data) => {
    locked = data.locked;
    numTimers = data.num_timers || 6;
    dmExclusive = data.dm_exclusive || false;
    document.body.style.opacity = locked ? 0.5 : 1;
    
    if (data.theme) {
        document.body.className = `theme-${data.theme} page-dm`;
    }

    if (data.custom_bg_url !== undefined) {
        applyCustomBg(data.custom_bg_url);
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

function render() {
    if (!TIMER_ID || !timers[TIMER_ID]) return;

    const t = timers[TIMER_ID];
    if (!t) return;

    document.getElementById("name").innerText = t.name;
    document.getElementById("time").innerText = formatTime(t.remaining);

    document.getElementById("status").innerText =
        t.remaining <= 0 ? "Finished" :
        (t.running ? "Running" : "Paused");

    document.getElementById("position").innerText =
        t.position ? `Order: ${t.position}` : "";

    const toggleBtn = document.getElementById("toggleBtn");
    toggleBtn.innerText = t.running ? "Pause" : "Start";
    toggleBtn.disabled = locked;

    // disable other buttons too
    document.querySelectorAll("button").forEach(btn => {
        if (btn.id !== "toggleBtn") {
            btn.disabled = locked;
        }
    });
}

function toggle() {
    if (locked) return;
    socket.emit("toggle", {timer: TIMER_ID});
}

function reset() {
    if (locked) return;
    socket.emit("reset", {timer: TIMER_ID});
}

function adjust(delta) {
    if (locked) return;
    socket.emit("adjust_timer", {timer: TIMER_ID, delta});
}
