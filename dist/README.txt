============================================================
DnD Combat Clock - User Manual & Getting Started Guide
============================================================

Welcome to the DnD Combat Clock! This tool makes managing turn-based combat fast, 
fun, and immersive for both the Dungeon Master (DM) and the players. 

You don't need any coding or technical knowledge to use this. Just follow the steps below!


------------------------------------------------------------
1. HOW TO START THE APP (LOCAL PLAY)
------------------------------------------------------------
1. Find the application file named "DnD-Clock.exe" in this folder.
2. Double-click the "DnD-Clock.exe" file to run it.
3. A black console window will appear. DO NOT close this window—this is the hidden "engine" running the application.
4. The console window will display two text links (URLs). They will look something like this:

   Server running at:
     Local:   http://localhost:5000
     Network: http://192.168.1.10:5000  (Your network numbers will be different)

5. That's it! The app is running. Open these links in a web browser (like Chrome, Safari, or Firefox).


------------------------------------------------------------
2. HOW TO PLAY OVER THE INTERNET (RUN_CLOUDFLARE)
------------------------------------------------------------
If your players are NOT in the same room as you (or not on your Wi-Fi), you can still use this app!

1. Make sure "DnD-Clock.exe" is already running.
2. Find the file named "run_cloudflare" (this might be a .bat or .exe file) in your folder and double-click it.
3. This will open a second console window that securely connects your app to the public internet using a "Cloudflare Tunnel".
4. Read the text in that new window to find your public URL (it usually ends in ".trycloudflare.com").
5. Share this public URL with your players (e.g., send them "https://your-random-words.trycloudflare.com/remote"). Now anyone in the world can connect to your game!

If you are using cloudflare instead of localhost, replace all the localhost url exammples below with the cloudflare url you get from the program.

------------------------------------------------------------
3. HOW TO VIEW THE DIFFERENT SCREENS (ENDPOINTS)
------------------------------------------------------------
This app gives you different screens for different purposes. To get to them, simply type the addresses below into your web browser's search bar.

The "Display Screen" (For the Big TV or Monitor)
- Where: Type `http://localhost:5000/` into your browser.
- What it does: This is a beautiful, distraction-free view meant to be cast to a TV or put on a second monitor for the whole table to see.

The "Control Panel" (For the DM)
- Where: Type `http://localhost:5000/control` into your browser.
- What it does: This is the primary command center! Use this screen to start/stop the game, add or delete timers, change themes/backgrounds, set initiative orders, and lock settings.

The "DM Clock" (For the Enemy Timers)
- Where: Type `http://localhost:5000/dm` into your browser.
- What it does: This is a streamlined interface for the Dungeon Master to adjust the enemy timers set in the control page

The "Player Remote" (For the Players' Phones)
- Where: Have your players connect to your Wi-Fi, open their phone browser, and type `http://[Your-Network-IP]:5000/remote` (e.g., http://192.168.1.10:5000/remote). 
   -Alternatively, show the display page for your environment and have them scan the QR code
- What it does: This gives each player a mobile-friendly view. They can easily tap their phone screen to start or pause their timer when their turn begins or ends. They can also press a "Raise Hand" button if they have a question!

*(Note: The DM can restrict what players can tap using the Control Panel).*

The "QR Code Page" (The easiest way for players to join)
- Where: Type `http://localhost:5000/qr` into your browser on the host computer.
- What it does: This shows large QR Codes on your screen! Instead of making your players type the complicated Network URL into their phones, just pull up this page. Players can point their phone cameras at the screen, and it will instantly load the Player Remote for them.


------------------------------------------------------------
4. QUICK TIPS FOR YOUR FIRST GAME
------------------------------------------------------------
- Set It Up: Before the game, go to the Control Panel (`/control`) and adjust the combatants, names, background theme, and starting time.
- Start Combat: Once initiative is rolled, enter the initiatives into the "Initiative Sync" section on the Control Panel and press "Set Initiatives."
- Protect the Timers: Use the "Master Controls: Locked/Unlocked" switch on the Control Panel so players can't accidentally change the timers until it's combat time.


------------------------------------------------------------
5. HOW TO CLOSE THE APP
------------------------------------------------------------
When your session is over, simply close the black console windows (the "DnD-Clock.exe" one, and the "run_cloudflare" one if you used it). This fully stops the application. All your names, timers, and themes are automatically saved!
