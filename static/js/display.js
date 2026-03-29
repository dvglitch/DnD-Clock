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

    // Remove any extra timers if numTimers was lowered
    for (let i = numTimers + 1; i <= 12; i++) {
        const div = document.getElementById(`display-timer-${i}`);
        if (div) div.remove();
    }

    for (let i = 1; i <= numTimers; i++) {
        const t = data[i];
        if (!t) continue; // Skip if timer doesn't exist

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
