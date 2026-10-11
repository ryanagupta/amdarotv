# Amdaro TV

An Apple TV-grade streaming web application designed for **LG OLED Smart TVs** (webOS 4.0+, Chromium 53 engine) and **Media Station X (MSX)** on Smart TVs (LG webOS, Samsung Tizen, Android TV, Fire TV).

---

## 📺 How to Use on Media Station X (MSX)

In the **Media Station X** app on your TV, the **Start Parameter Setup** input field does **not** allow typing forward slashes (`/`)—the on-screen keyboard only permits letters, numbers, dots (`.`), hyphens (`-`), and colons (`:`).

Amdaro TV is pre-configured with official MSX entry points (`/msx/start.json`, `/msx/menu.json`, `/start.json`, `/menu.json`) with auto-replacement tokens `{PREFIX}` and `{SERVER}` so it connects **on the first try** without needing any forward slashes!

### Option 1: Local Network (Zero Forward Slashes - Recommended)

1. **Start the local server** on your computer:
   - **Windows (Native PowerShell - No extra installs needed):**
     ```powershell
     powershell -ExecutionPolicy Bypass -File server.ps1
     ```
   - **Python:**
     ```bash
     python server.py
     ```
   - **Node.js:**
     ```bash
     node server.js
     ```

2. The server will print your exact local IP and port in the terminal:
   ```text
   ================================================================
              AMDARO TV - MEDIA STATION X SERVER
   ================================================================
   Web Server Active on: http://192.168.1.50:8080/
   ----------------------------------------------------------------
   INSTRUCTIONS FOR YOUR TV:
   1. Open 'Media Station X' on your TV.
   2. Navigate to: Settings -> Start Parameter -> Setup
   3. In the input box, enter ONLY this (NO forward slashes):
      -->  192.168.1.50:8080  <--
   4. Press OK / click the checkmark.
   5. Amdaro TV will automatically launch full screen!
   ================================================================
   ```

3. On your TV:
   - Open **Media Station X**.
   - Go to **Settings ➔ Start Parameter ➔ Setup**.
   - Type your computer's IP and port (e.g. `192.168.1.50:8080`).
   - Click the checkmark to save.
   - Amdaro TV will immediately launch full-screen!

---

### Option 2: Cloud / Web Hosting (Zero Forward Slashes)

If you host Amdaro TV on a root domain or subdomain without subpaths (e.g., using Vercel, Netlify, Render, or Surge):
- Example URL: `https://amdarotv.vercel.app`
- In Media Station X: Go to **Settings ➔ Start Parameter ➔ Setup** and type:
  ```text
  amdarotv.vercel.app
  ```
  *(Notice: No `https://` and no forward slashes! Media Station X automatically requests `https://amdarotv.vercel.app/msx/start.json`).*

---

### Option 3: GitHub Pages via MSX URL Shortener (Zero Forward Slashes)

Media Station X has built-in support for URL shorteners using the `id:{SERVICE}:{ALIAS}` syntax:

1. Enable GitHub Pages on your repository (`https://ryanagupta.github.io/amdarotv/`).
2. Create a short URL for your start configuration:
   - Point **TinyURL** (`tinyurl.com/amdarotv`) to:
     `https://ryanagupta.github.io/amdarotv/msx/start.json`
   - Or point **is.gd** (`is.gd/amdarotv`) to:
     `https://ryanagupta.github.io/amdarotv/msx/start.json`
3. On Media Station X:
   - Go to **Settings ➔ Start Parameter ➔ Setup**.
   - Enter either of these (letters and colons only—**no slashes**!):
     ```text
     id:trl:amdarotv
     ```
     or
     ```text
     id:igd:amdarotv
     ```

---

## 🎮 Magic Remote & TV Controls

Amdaro TV natively supports the LG Magic Remote and standard 5-way TV remotes:

| Button | Keycode | Action |
| :--- | :--- | :--- |
| **Left / Up / Right / Down** | `37`, `38`, `39`, `40` | Buttery-smooth spatial navigation across tiles & keyboard |
| **OK / Enter** | `13` | Select focused item / play stream / type letter |
| **Back** | `461` / `27` | Closes player ➔ closes modal ➔ returns to Media Station X |
| **Play / Pause** | `415`, `19` | Toggle video playback |
| **Rewind / Fast-Forward** | `412`, `417` | Jump backward / forward 10s |

---

## ✨ Features

- **Apple TV Cinema UI:** Slow, buttery smooth `0.42s - 0.56s` spring animations and soft focus halos.
- **Pure White Timeline & Scrubber:** Clean, minimalist player scrubber with smooth expansion on focus/hover.
- **Audio Language Switcher:** On-screen audio track selector with multi-language stream switching.
- **Full Media Station X Integration:** Pre-configured `start.json`, `menu.json`, `.htaccess`, and auto-IP server scripts.
- **Native webOS Packaging:** Includes `appinfo.json` for building `.ipk` packages via LG `ares-package .`.
