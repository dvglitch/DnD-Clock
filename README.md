# DnD Clock

A real-time, highly animated, and interactive timer/clock system built specifically for Dungeons & Dragons and other tabletop RPGs. It provides a synchronized display screen for players, a dense control panel for the Dungeon Master, and mobile-friendly remotes for players at the table or online.

## Features
- **Dynamic Real-Time Synchronization:** Uses WebSockets (Socket.IO) to instantly sync timers, themes, and settings across all connected devices.
- **DM Control Panel (`/dm`):** A dense, streamlined interface for the DM to manage timers, edit character names, calculate initiative, and switch visual themes.
- **Player Display (`/display`):** A clean, thematic view of the active timers meant to be shown on a shared screen or TV.
- **Player Remotes (`/remote`):** A mobile-friendly interface giving players the ability to adjust their own timers (with an optional DM lock to prevent cheating/accidental taps).
- **Persistent Settings:** All timer names, default durations, and active themes are automatically saved and persist between sessions.
- **Smart QR Codes:** The built-in QR code dynamically adapts to help your players connect whether you are playing in the same room on local Wi-Fi or across the internet.

---

## Installation

### Prerequisites
- Python 3.8+
- (Optional but recommended) A virtual environment

```cmd
# Create a virtual environment (optional)
python -m venv venv
venv\Scripts\activate

# Install the required dependencies
pip install -r requirements.txt 
# Or if you don't have a requirements.txt: pip install Flask Flask-SocketIO eventlet qrcode
```

---

## How to Run the App

There are two primary ways to run this application for your D&D group depending on whether you are playing in-person or remotely.

### Method 1: Local Network (In-Person Play)
If all of your players are in the same room and connected to the same Wi-Fi network:

1. Open your terminal in the `DnD-Clock` folder and run `python app.py`.
2. The terminal will print two URLs. 
3. Open the **Local** URL (`http://localhost:5000/dm`) on the machine running the app to access the DM controls.
4. Open the **Network** URL (e.g., `http://192.168.1.X:5000/display`) on the screen you want the players to see.
5. Have your players scan the QR code to open their remotes on their phones.

### Method 2: Internet / Remote Play (Using Cloudflare)
If you have players joining over Discord/Zoom, or if your local Wi-Fi router blocks device-to-device communication, you can safely expose the app to the internet for free using Cloudflare.

1. Start the app locally by running `python app.py`. **Leave this terminal open.**
2. Download [Cloudflared for Windows](https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe) and place the `.exe` inside this `DnD-Clock` folder.
3. Open a **second** terminal in this folder and run:
   ```cmd
   .\cloudflared-windows-amd64.exe tunnel --url http://localhost:5000
   ```
4. Find the URL it generates for you (it will look something like `https://some-random-words.trycloudflare.com`).
5. Open that URL on your computer and navigate to `/dm`.
6. Send the URL to your online players so they can access the display or remote! 

*(Note: The QR code inside the app will automatically update to point to this new Cloudflare link!)*
