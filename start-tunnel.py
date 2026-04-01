import os
import sys
import subprocess
import urllib.request

BINARY = "cloudflared-windows-amd64.exe"
URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

def download_progress(block_num, block_size, total_size):
    # Simple console progress bar
    if total_size > 0:
        percent = int(block_num * block_size * 100 / total_size)
        sys.stdout.write(f"\r[DnD-Clock] Downloading: {percent}% ")
        sys.stdout.flush()

def main():
    print("==========================================")
    print("   DnD-Clock: Cloudflare Tunnel System")
    print("==========================================\n")

    # If the binary is in the parent directory (as it would be if run from dist)
    # let's just use the current directory as standard.
    
    if not os.path.exists(BINARY):
        print(f"[!] Cloudflare binary not found.")
        print(f"[*] Downloading latest version (65MB). This only happens once...")
        try:
            urllib.request.urlretrieve(URL, BINARY, download_progress)
            print("\n[OK] Download complete.")
        except Exception as e:
            print(f"\n[ERROR] Download failed: {e}")
            input("\nPress Enter to exit...")
            return

    if os.path.exists(BINARY):
        print("[OK] Binary ready.")
        print("[*] Starting the tunnel to your local DnD-Clock server...")
        print("[*] (Make sure your DnD-Clock.exe is already running!)\n")
        
        try:
            # Launch the tunnel!
            subprocess.run([BINARY, "tunnel", "--url", "http://localhost:5000"])
        except KeyboardInterrupt:
            print("\n[!] Tunnel closed by user.")
        except Exception as e:
            print(f"\n[ERROR] Failed to launch tunnel: {e}")
            input("\nPress Enter to exit...")
    else:
        print("[ERROR] Binary still missing after download attempt.")
        input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
