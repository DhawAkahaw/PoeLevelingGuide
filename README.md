# PoE Leveling Overlay

A lightweight Electron overlay for Path of Exile that auto-detects your current zone from `Client.txt` and shows you step-by-step leveling instructions.

---
TEST TEST
## ✅ Prerequisites

Install these before anything else:

| Tool | Download | Why |
|------|----------|-----|
| **Node.js** (v18+) | https://nodejs.org | Runs the app |
| **npm** | Comes with Node.js | Installs packages |
| **Git** (optional) | https://git-scm.com | To clone/manage the project |

To verify you have Node.js:
```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
```

---

## 🚀 Setup (first time)

```bash
# 1. Navigate to the project folder
cd poe-overlay

# 2. Install dependencies (Electron + chokidar)
npm install

# 3. Run the overlay
npm start
```

That's it. The overlay window will appear.

---

## ⚙️ Configuration

### Set your PoE log file path

Open `src/main/main.js` and find the `POE_LOG_PATHS` array at the top.
Add your specific path if it's not already listed:

```js
const POE_LOG_PATHS = [
  'C:/Program Files (x86)/Grinding Gear Games/Path of Exile/logs/Client.txt',
  // your path here...
];
```

**Default locations:**
- Steam (Windows): `C:\Program Files (x86)\Steam\steamapps\common\Path of Exile\logs\Client.txt`
- Standalone (Windows): `C:\Program Files (x86)\Grinding Gear Games\Path of Exile\logs\Client.txt`
- Linux/Steam: `~/.local/share/Steam/steamapps/common/Path of Exile/logs/Client.txt`

### Change hotkeys

Also at the top of `src/main/main.js`:

```js
const HOTKEY_TOGGLE = 'Ctrl+D';      // Show/hide overlay
const HOTKEY_NEXT   = 'Ctrl+Right';  // Next zone step
const HOTKEY_PREV   = 'Ctrl+Left';   // Previous zone step
```

---

## 🎮 Usage

1. Start Path of Exile
2. Start the overlay (`npm start`)
3. The green indicator in the header means it's reading your log file
4. Enter any zone in PoE — the overlay auto-jumps to that zone's guide
5. Use **Ctrl+D** to toggle visibility while gaming

### Controls

| Control | Action |
|---------|--------|
| `Ctrl+D` | Show / hide overlay |
| `Ctrl+→` | Next zone manually |
| `Ctrl+←` | Previous zone manually |
| `⊙` button | Toggle click-through mode |
| `−` button | Collapse/expand content |
| Click any action | Mark it done (strikethrough) |

---

## 📁 Project Structure

```
poe-overlay/
├── src/
│   ├── main/
│   │   ├── main.js       ← Electron main process (log watcher, hotkeys)
│   │   └── preload.js    ← Secure IPC bridge
│   ├── renderer/
│   │   ├── index.html    ← Overlay UI
│   │   ├── style.css     ← Dark gaming aesthetic
│   │   └── app.js        ← Guide engine + UI logic
│   └── guide-data/
│       └── act1-2.json   ← Leveling guide data
└── package.json
```

---

## ➕ Adding More Guide Content

Edit `src/guide-data/act1-2.json` to add more zones.
Each zone entry looks like:

```json
"The Mud Flats": {
  "act": 1,
  "type": "outdoor",
  "actions": [
    "Activate the Waypoint",
    "Collect 3 Glyphs for Nessa's quest"
  ],
  "rewards": [
    { "npc": "Nessa", "reward": "Quicksilver Flask" }
  ],
  "tips": "Glyphs glow cyan on the ground.",
  "next": "The Submerged Passage"
}
```

Also add the zone name (in order) to the `GUIDE_ZONES_ORDERED` array in `src/renderer/app.js`.

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
