const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the renderer (no direct Node.js access)
contextBridge.exposeInMainWorld('poeOverlay', {

  // ── Receive events from main process ──
  onZoneEntered: (cb) => ipcRenderer.on('zone-entered', (_, data) => cb(data)),
  onLevelUp:     (cb) => ipcRenderer.on('level-up',     (_, data) => cb(data)),
  onDeath:       (cb) => ipcRenderer.on('death',        (_, data) => cb(data)),
  onHotkeyNext:  (cb) => ipcRenderer.on('hotkey-next',  (_, data) => cb(data)),
  onHotkeyPrev:  (cb) => ipcRenderer.on('hotkey-prev',  (_, data) => cb(data)),
  onLogStatus:   (cb) => ipcRenderer.on('log-status',   (_, data) => cb(data)),

  // ── Send events to main process ──
  getLogStatus:    ()         => ipcRenderer.invoke('get-log-status'),
  setClickthrough: (enabled)  => ipcRenderer.send('set-clickthrough', enabled),
  loadProfiles:    ()         => ipcRenderer.invoke('load-profiles'),
  saveProfiles:    (profiles) => ipcRenderer.invoke('save-profiles', profiles),

  // ── Remove listeners (cleanup) ──
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
