const socket = io("http://" + location.hostname + ":5000");

let numTimers = 6;
let dmExclusive = false;

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

    const container = document.getElementById("timers");
    if (numTimers <= 4) {
        container.style.gridTemplateColumns = "repeat(2, 1fr)";
    } else {
        container.style.gridTemplateColumns = "repeat(3, 1fr)";
    }
});

socket.on("update", (data) => {
    const container = document.getElementById("timers");
    container.innerHTML = "";

    for (let i = 1; i <= numTimers; i++) {
        const t = data[i];
        if (!t) continue; // Skip if timer doesn't exist

        let bg = "#444"; // paused
        if (t.running) bg = "#1e7f3f"; // green
        if (t.remaining <= 0) bg = "#a83232"; // red
        
        const pct = Math.max(0, Math.min(100, (t.remaining / t.duration) * 100));
        let pbColor = "#4CAF50"; // Green
        if (pct <= 50) pbColor = "#f39c12"; // Yellow/Orange
        if (pct <= 20) pbColor = "#e74c3c"; // Red

        let border = "2px solid transparent";

        if (t.position === 1) border = "4px solid gold";
        else if (t.position === 2) border = "4px solid silver";
        else if (t.position === 3) border = "4px solid #cd7f32";

        let boxShadow = "0 4px 10px rgba(0,0,0,0.5)";
        if (t.raised_hand) {
            boxShadow = "inset 0 0 50px 10px rgba(255, 215, 0, 0.5), inset 0 0 20px 5px rgba(255, 215, 0, 0.8), " + boxShadow;
        }

        const div = document.createElement("div");
        div.style = `
            background:${bg};
            border-radius:15px;
            padding:30px;
            text-align:center;
            font-size:30px;
            ${border};
            box-shadow:${boxShadow};
            position:relative;
            transition: all 0.3s ease;
        `;

        div.innerHTML = `
            <div style="font-size:24px; margin-bottom:10px; text-shadow: 1px 1px 2px black;">
                ${t.name || "Timer " + i}
            </div>

            <div style="font-size:64px; font-weight:bold; font-variant-numeric: tabular-nums; text-shadow: 2px 2px 4px black;">
                ${formatTime(t.remaining)}
            </div>

            <div style="margin-top:10px;">
                ${t.running ? "Running" : (t.remaining <= 0 ? "Finished" : "Paused")}
            </div>

            ${t.position ? `
                <div style="margin-top:15px; font-size:28px;">
                    Order: ${t.position}
                </div>
            ` : ""}
            
            ${t.condition ? `
                <div style="position:absolute; top:-12px; right:-12px; background:linear-gradient(145deg, #333, #111); color:#fff; padding:6px 16px; border-radius:4px; font-size:22px; font-weight:bold; font-family:'Cinzel', serif; box-shadow:0 6px 12px rgba(0,0,0,0.8); border:2px solid #666; letter-spacing:1px;">
                    ${t.condition}
                </div>
            ` : ""}

            <!-- Progress Bar -->
            <div style="position:absolute; bottom:0; left:0; right:0; height:12px; background:rgba(0,0,0,0.5); border-radius:0 0 15px 15px; overflow:hidden;">
                <div style="height:100%; width:${pct}%; background:${pbColor}; transition:width 0.5s linear, background-color 0.5s;"></div>
            </div>
        `;

        container.appendChild(div);
    }
});
