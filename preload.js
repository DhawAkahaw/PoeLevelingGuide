const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the renderer (no direct Node.js access)
contextBridge.exposeInMainWorld('poeOverlay', {

  // ── Receive events from main process ──
  onZoneEntered: (cb) => ipcRenderer.on('zone-entered', (_, data) => cb(data)),
  onLevelUp:     (cb) => ipcRenderer.on('level-up',     (_, data) => cb(data)),
  onDeath:       (cb) => ipcRenderer.on('death',        (_, data) => cb(data)),
  onHotkeyNext:  (cb) => ipcRenderer.on('hotkey-next',  (_, data) => cb(data)),
  onHotkeyPrev:  (cb) => ipcRenderer.on('hotkey-prev',  (_, data) => cb(data)),
  onToggleHud:   (cb) => ipcRenderer.on('toggle-hud',   (_, data) => cb(data)),
  onLogStatus:   (cb) => ipcRenderer.on('log-status',   (_, data) => cb(data)),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_, data) => cb(data)),
  getUpdateStatus: ()  => ipcRenderer.invoke('get-update-status'),
  installUpdate:  ()  => ipcRenderer.send('install-update'),

  // ── Send events to main process ──
  getLogStatus:    ()         => ipcRenderer.invoke('get-log-status'),
  setClickthrough: (enabled)  => ipcRenderer.send('set-clickthrough', enabled),
  quitApp:          ()         => ipcRenderer.send('quit-app'),
  fetchMaxrollGuide: (url)     => ipcRenderer.invoke('fetch-maxroll-guide', url),
  loadProfiles:    ()         => ipcRenderer.invoke('load-profiles'),
  saveProfiles:    (profiles) => ipcRenderer.invoke('save-profiles', profiles),
  loadItemCache:   ()         => ipcRenderer.invoke('load-item-cache'),
  saveItemCache:   (cache)    => ipcRenderer.invoke('save-item-cache', cache),
  fetchPoeNinja:   (type)     => ipcRenderer.invoke('fetch-poe-ninja', type),

  // ── Remove listeners (cleanup) ──
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
