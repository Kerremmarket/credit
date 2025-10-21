# Docker Desktop Installation Guide (Windows)

## Step-by-Step Instructions

### 1. Download Docker Desktop

Go to: **https://www.docker.com/products/docker-desktop**

Click the **"Download for Windows"** button.

---

### 2. Run the Installer

1. Find the downloaded file: `Docker Desktop Installer.exe`
2. Double-click to run it
3. If prompted by Windows, click **"Yes"** to allow installation
4. Keep the default settings:
   - ✅ Use WSL 2 instead of Hyper-V (recommended)
   - ✅ Add shortcut to desktop
5. Click **"Ok"** to start installation
6. Wait for installation to complete (~5 minutes)
7. Click **"Close and restart"**

---

### 3. Start Docker Desktop

1. After restart, Docker Desktop should auto-start
2. If not, double-click the Docker Desktop icon
3. You may need to accept the service agreement
4. Wait for Docker to start (you'll see "Docker Desktop is running")
5. Look for the whale icon 🐋 in your system tray (bottom-right)

---

### 4. Verify Installation

1. Open Command Prompt (search "cmd" in Start menu)
2. Type: `docker --version`
3. You should see something like: `Docker version 24.x.x`

✅ **Docker is now installed!**

---

### 5. Run the Application

Now you can go back to the main folder and:
- Double-click **`START.bat`**

---

## Troubleshooting Installation

### "WSL 2 installation is incomplete"

You may need to install WSL 2. Docker will prompt you with a link.

1. Click the link in the error message
2. Download and install the WSL2 kernel update
3. Restart Docker Desktop

### "Windows feature not enabled"

You may need to enable virtualization in BIOS:

1. Restart computer
2. Enter BIOS (usually F2, F10, or Del during startup)
3. Find "Virtualization" or "VT-x" setting
4. Enable it
5. Save and restart

### Still having issues?

- Make sure Windows is up to date
- Try restarting your computer
- Check Docker's official troubleshooting: https://docs.docker.com/desktop/troubleshoot/overview/

---

## System Requirements

- Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
- OR Windows 11 64-bit: Home or Pro version 21H2 or higher
- 4 GB RAM minimum (8 GB recommended)
- BIOS-level hardware virtualization support must be enabled

---

**Once Docker is installed, you only need to do this once!**

Go back to `README_PROFESSOR.md` for usage instructions.

