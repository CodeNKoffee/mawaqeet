// Secure bridge between the renderer (web UI) and the Electron main process.
// The renderer only ever sees `window.mawaqeet`. Keeping this surface small
// and platform-agnostic means the same UI can run under Capacitor on mobile
// with a different bridge implementation.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mawaqeet", {
  platform: process.platform,

  // ---- live prayer state ----
  getState: () => ipcRenderer.invoke("state:get"),
  onState: (cb) => {
    const h = (_e, data) => cb(data);
    ipcRenderer.on("state", h);
    return () => ipcRenderer.removeListener("state", h);
  },

  // ---- settings ----
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (patch) => ipcRenderer.invoke("settings:set", patch),

  // ---- location ----
  detectLocation: () => ipcRenderer.invoke("geo:detect"),
  searchCity: (q) => ipcRenderer.invoke("geo:search", q),
  setLocation: (loc) => ipcRenderer.invoke("location:set", loc),

  // ---- events (meetings / interviews) ----
  addEvent: (ev) => ipcRenderer.invoke("events:add", ev),
  updateEvent: (ev) => ipcRenderer.invoke("events:update", ev),
  removeEvent: (id) => ipcRenderer.invoke("events:remove", id),

  // ---- verses ----
  versesAll: () => ipcRenderer.invoke("verses:all"),

  // ---- blocker ----
  blockerInfo: () => ipcRenderer.invoke("blocker:info"),
  blockerUnlock: (passphrase) => ipcRenderer.invoke("blocker:unlock", passphrase),
  blockerDismiss: () => ipcRenderer.invoke("blocker:dismiss"),
  previewBlocker: (key) => ipcRenderer.invoke("blocker:preview", key),

  // ---- windows / app ----
  openSettings: () => ipcRenderer.invoke("window:settings"),
  quit: () => ipcRenderer.invoke("app:quit"),
});
