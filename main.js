const { app, BrowserWindow, globalShortcut, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const { autoUpdater } = require('electron-updater');

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const POE_LOG_PATHS = [
  'C:/Program Files (x86)/Steam/steamapps/common/Path of Exile/logs/Client.txt',
  'C:/Program Files/Steam/steamapps/common/Path of Exile/logs/Client.txt',
  `${process.env.HOME}/.local/share/Steam/steamapps/common/Path of Exile/logs/Client.txt`,
];

const HOTKEY_TOGGLE = 'Ctrl+D';
const HOTKEY_NEXT   = 'Ctrl+Right';
const HOTKEY_PREV   = 'Ctrl+Left';

// How many bytes to read from the END of client.txt on startup
// 200kb is enough to catch your current zone + recent level ups
const STARTUP_READ_BYTES = 200 * 1024;

// ─── PERSIST FILE (saves level + zone between sessions) ────────────────────────
const SAVE_FILE = path.join(app.getPath('userData'), 'poe-overlay-state.json');
const PROFILES_FILE = path.join(app.getPath('userData'), 'poe-profiles.json');
const ITEM_CACHE_FILE = path.join(app.getPath('userData'), 'poe-item-cache.json');

function loadSavedState() {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      return JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { level: null, zoneName: null };
}

function saveState(data) {
  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(data), 'utf8');
  } catch (e) {}
}

// ─── STATE ─────────────────────────────────────────────────────────────────────
let overlayWindow = null;
let logWatcher    = null;
let logFilePath   = null;
let lastFileSize  = 0;
let currentState  = loadSavedState(); // { level, zoneName }

// ─── FIND LOG FILE ─────────────────────────────────────────────────────────────
function findLogFile() {
  for (const p of POE_LOG_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ─── CREATE OVERLAY WINDOW ─────────────────────────────────────────────────────
function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 460,
    height: 700,
    x: 20,
    y: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  overlayWindow.loadFile(path.join(__dirname, 'index.html'));
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  if (process.argv.includes('--dev')) {
    overlayWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Once the window is ready, send the saved state immediately
  overlayWindow.webContents.on('did-finish-load', () => {
    if (currentState.level) {
      sendToOverlay('level-up', { level: currentState.level });
    }
    if (currentState.zoneName) {
      sendToOverlay('zone-entered', { zone: currentState.zoneName });
    }
  });

  overlayWindow.on('closed', () => { overlayWindow = null; });
}

// ─── PARSE LOG LINES ───────────────────────────────────────────────────────────
const PATTERNS = {
  zoneEnter: /\] : You have entered (.+)\./,
  levelUp:   /\] : (.+) \((.+)\) is now level (\d+)/,
  levelUp2:  /\] : .+ is now level (\d+)/,
  death:     /\] : .+ has been slain\./,
};

function parseLogLines(lines, isStartup = false) {
  // On startup we scan ALL lines to find the LAST zone + HIGHEST level
  // On live updates we process each line as it comes in
  let latestZone  = null;
  let latestLevel = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const zoneMatch = line.match(PATTERNS.zoneEnter);
    if (zoneMatch) {
      latestZone = zoneMatch[1];
      if (!isStartup) {
        console.log(`[PoE Overlay] Zone: ${latestZone}`);
        sendToOverlay('zone-entered', { zone: latestZone });
        currentState.zoneName = latestZone;
        saveState(currentState);
      }
      continue;
    }

    // Try both level patterns
    const lvlMatch = line.match(PATTERNS.levelUp) || line.match(PATTERNS.levelUp2);
    if (lvlMatch) {
      const level = parseInt(lvlMatch[lvlMatch.length - 1]);
      if (!isNaN(level)) {
        latestLevel = level;
        if (!isStartup) {
          console.log(`[PoE Overlay] Level: ${level}`);
          sendToOverlay('level-up', { level });
          currentState.level = level;
          saveState(currentState);
        }
      }
      continue;
    }

    if (!isStartup && PATTERNS.death.test(line)) {
      sendToOverlay('death', {});
    }
  }

  // After scanning startup lines, send the final discovered state
  if (isStartup) {
    if (latestZone) {
      console.log(`[PoE Overlay] Startup zone: ${latestZone}`);
      currentState.zoneName = latestZone;
      sendToOverlay('zone-entered', { zone: latestZone });
    }
    if (latestLevel) {
      console.log(`[PoE Overlay] Startup level: ${latestLevel}`);
      currentState.level = latestLevel;
      sendToOverlay('level-up', { level: latestLevel });
    }
    if (latestZone || latestLevel) saveState(currentState);
  }
}

// ─── READ TAIL OF LOG ON STARTUP ───────────────────────────────────────────────
function readLogTail(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const start = Math.max(0, fileSize - STARTUP_READ_BYTES);

    const buf = Buffer.alloc(Math.min(STARTUP_READ_BYTES, fileSize));
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);

    const text = buf.toString('utf8');
    const lines = text.split('\n');
    console.log(`[PoE Overlay] Scanning last ${lines.length} log lines for current state...`);
    parseLogLines(lines, true); // isStartup = true
  } catch (err) {
    console.error('[PoE Overlay] Failed to read log tail:', err.message);
  }
}

// ─── LIVE LOG WATCHER ──────────────────────────────────────────────────────────
function startLogWatcher(filePath) {
  logFilePath  = filePath;
  lastFileSize = fs.statSync(filePath).size;

  console.log(`[PoE Overlay] Watching: ${filePath}`);

  logWatcher = chokidar.watch(filePath, {
    persistent: true,
    usePolling: false,
    awaitWriteFinish: false,
  });

  logWatcher.on('change', () => {
    try {
      const stat = fs.statSync(filePath);
      const newSize = stat.size;
      if (newSize <= lastFileSize) return;

      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(newSize - lastFileSize);
      fs.readSync(fd, buf, 0, buf.length, lastFileSize);
      fs.closeSync(fd);

      lastFileSize = newSize;
      const newText = buf.toString('utf8');
      parseLogLines(newText.split('\n'), false); // isStartup = false
    } catch (err) {
      console.error('[PoE Overlay] Read error:', err.message);
    }
  });
}

// ─── IPC ───────────────────────────────────────────────────────────────────────
function sendToOverlay(event, data) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send(event, data);
  }
}

ipcMain.handle('get-log-status', () => ({
  watching: !!logWatcher,
  path: logFilePath || 'Not found',
  savedState: currentState,
}));

ipcMain.on('set-clickthrough', (_, enable) => {
  if (!overlayWindow) return;
  if (enable) {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    overlayWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// ─── FETCH MAXROLL GUIDE (from main process to avoid CORS) ──────────────────
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('fetch-maxroll-guide', async (_, url) => {
  try {
    // Validate URL
    if (!url || !url.includes('maxroll.gg/poe/build-guides/')) {
      return { error: 'Invalid Maxroll URL. Must be a maxroll.gg/poe/build-guides/ URL.' };
    }
    const resp = await require('electron').net.fetch(url);
    if (!resp.ok) return { error: `HTTP ${resp.status}: ${resp.statusText}` };
    const html = await resp.text();
    return { html };
  } catch (e) {
    console.error('[PoE Overlay] Failed to fetch Maxroll guide:', e.message);
    return { error: e.message };
  }
});

// ─── PROFILES FILE I/O ─────────────────────────────────────────────────────────
ipcMain.handle('load-profiles', () => {
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[PoE Overlay] Failed to load profiles:', e.message);
  }
  return {};
});

ipcMain.handle('save-profiles', (_, profiles) => {
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[PoE Overlay] Failed to save profiles:', e.message);
    return false;
  }
});

// ─── ITEM CACHE FILE I/O ─────────────────────────────────────────────────────────────────
ipcMain.handle('load-item-cache', () => {
  try {
    if (fs.existsSync(ITEM_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(ITEM_CACHE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[PoE Overlay] Failed to load item cache:', e.message);
  }
  return {};
});

ipcMain.handle('save-item-cache', (_, cache) => {
  try {
    fs.writeFileSync(ITEM_CACHE_FILE, JSON.stringify(cache), 'utf8');
    return true;
  } catch (e) {
    console.error('[PoE Overlay] Failed to save item cache:', e.message);
    return false;
  }
});

// ─── FETCH POE.NINJA DATA (from main process to avoid CORS) ─────────────────
ipcMain.handle('fetch-poe-ninja', async (_, type) => {
  try {
    const url = `https://poe.ninja/api/data/itemoverview?league=Standard&type=${type}&language=en`;
    const resp = await require('electron').net.fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data;
  } catch (e) {
    console.error(`[PoE Overlay] Failed to fetch poe.ninja ${type}:`, e.message);
    return null;
  }
});

// ─── APP LIFECYCLE ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createOverlayWindow();
  // ─── AUTO-UPDATER ──────────────────────────────────────
  // Only check for updates in packaged builds, not during npm start
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
      sendToOverlay('update-status', { status: 'downloading' });
    });

    autoUpdater.on('update-downloaded', () => {
      sendToOverlay('update-status', { status: 'ready' });
    });

    autoUpdater.on('error', (err) => {
      console.error('[AutoUpdater] Error:', err.message);
    });
  }
  globalShortcut.register(HOTKEY_TOGGLE, () => {
    if (!overlayWindow) return;
    sendToOverlay('toggle-hud', {});
  });

  globalShortcut.register(HOTKEY_NEXT, () => sendToOverlay('hotkey-next', {}));
  globalShortcut.register(HOTKEY_PREV, () => sendToOverlay('hotkey-prev', {}));

  const logPath = findLogFile();
  if (logPath) {
    // 1. First do a startup scan to get current zone + level
    // Wait for window to be ready before scanning
    overlayWindow.webContents.once('did-finish-load', () => {
      readLogTail(logPath);
      // 2. Then start live watching for new changes
      startLogWatcher(logPath);
      sendToOverlay('log-status', { connected: true, path: logPath });
    });
  } else {
    console.warn('[PoE Overlay] Client.txt not found — check POE_LOG_PATHS in main.js');
    overlayWindow.webContents.once('did-finish-load', () => {
      sendToOverlay('log-status', { connected: false, path: null });
      // Still send saved state even without log file
      if (currentState.level)    sendToOverlay('level-up',     { level: currentState.level });
      if (currentState.zoneName) sendToOverlay('zone-entered', { zone: currentState.zoneName });
    });
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (logWatcher) logWatcher.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
