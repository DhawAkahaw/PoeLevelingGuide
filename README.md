# PoE Leveling Guide Overlay

A lightweight always-on-top overlay for Path of Exile that auto-detects your current zone from `Client.txt` and shows step-by-step leveling actions, gem tooltips, optional/mandatory filtering, and a compact HUD mode for in-game use.

---

## ⬇️ Download

> **No Node.js or coding required** — just download and run the installer.

### [⬇ Download Latest Release](https://github.com/DhawAkahaw/PoeLevelingGuide/releases/latest)

1. Go to the link above 
2. Download `PoE.Leveling.Guide.Setup.x.x.x.exe`
3. Run the installer — it installs silently and launches automatically
4. The overlay appears. Done.

**Auto-updates:** When a new version is pushed, the app will download it in the background and show a green *"Restart & Install"* banner — one click to update.

---

## 🎮 How to Use

| Control | Action |
|---------|--------|
| `Ctrl+D` | Toggle HUD mode (compact in-game view) |
| `Ctrl+→` | Next zone |
| `Ctrl+←` | Previous zone |
| `◉` button | Switch between full panel and HUD mode |
| `⊙` button | Toggle click-through (game gets all mouse clicks) |
| `−` button | Minimize/expand panel |
| `🌐` button | Import any Maxroll build guide by URL |
| Click action | Mark it done (strikethrough) |

### HUD Mode
Press `Ctrl+D` in-game to switch to a minimal floating panel in the top-left. It fades to near-invisible and reveals on hover. Press `Ctrl+D` again to go back to the full overlay.

---

## ⚙️ Configuration

### PoE Log File Path

Open `main.js` and check the `POE_LOG_PATHS` array at the top. Add your path if needed:

```js
const POE_LOG_PATHS = [
  'C:/Program Files (x86)/Steam/steamapps/common/Path of Exile/logs/Client.txt',
  // add your path here if different
];
```

**Default locations:**
- Steam (Windows): `C:\Program Files (x86)\Steam\steamapps\common\Path of Exile\logs\Client.txt`
- Standalone: `C:\Program Files (x86)\Grinding Gear Games\Path of Exile\logs\Client.txt`

### Hotkeys

```js
const HOTKEY_TOGGLE = 'Ctrl+D';      // Toggle HUD mode
const HOTKEY_NEXT   = 'Ctrl+Right';  // Next zone
const HOTKEY_PREV   = 'Ctrl+Left';   // Previous zone
```

---

## 🛠️ Dev Setup (contributors)

```bash
git clone https://github.com/DhawAkahaw/PoeLevelingGuide.git
cd PoeLevelingGuide
npm install
npm start
```

To build a local `.exe`:
```bash
npm run build        # builds to dist/ — not published
```

To publish a new release to GitHub (maintainers only):
```bash
git tag v1.x.x
git push origin v1.x.x   # triggers GitHub Actions → builds exe → creates release
```

---

## 📁 Project Structure

```
PoeLevelingGuide/
├── main.js          ← Electron main process (log watcher, hotkeys, updater)
├── preload.js       ← Secure IPC bridge
├── index.html       ← Overlay UI
├── style.css        ← PoE dark theme
├── app.js           ← Guide engine + UI logic
├── poe-item-data.js ← Gem/item tooltip system
├── act1-10.json     ← Full Acts 1-10 leveling guide data
└── .github/
    └── workflows/
        └── release.yml  ← Auto-build on git tag push
```

---

## 🛠 Troubleshooting

**Overlay shows "Disconnected"**
→ Check your `Client.txt` path in `main.js`. Make sure the file exists.

**Zone changes aren't detected**
→ In PoE settings, ensure "Log Debug to file" is enabled (Options → UI → Enable Log Debug Info... actually it's always on by default for Client.txt).

**Overlay is behind the game**
→ Run PoE in **Windowed Fullscreen** or **Windowed** mode, not true Fullscreen.

**Hotkeys don't work**
→ Make sure no other app is using the same key combo.

---

## 🔮 What to build next

- [ ] Full Act 3–10 guide data
- [ ] Quest tracker with checkboxes that persist
- [ ] PoE Trade API integration (Ctrl+C on item → show price)
- [ ] Minimap zone layout hints
- [ ] Build-specific gem recommendation panels
- [ ] Auto-updater for guide data (fetch from community JSON)
"# PoeLevelingGuide" 
