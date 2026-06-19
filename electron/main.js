// Mawaqeet — main process.
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  Notification,
  ipcMain,
  shell,
} = require("electron");
const path = require("path");

const store = require("./lib/store");
const geo = require("./lib/geo");
const verses = require("./lib/verses");
const blocker = require("./lib/blocker");
const scheduler = require("./lib/scheduler");
const { methodForCountry } = require("./lib/methods");

const isDev = process.argv.includes("--dev");
const ICON_PNG = path.join(__dirname, "..", "src", "assets", "appicon.png");
const TRAY_ICON = path.join(__dirname, "..", "src", "assets", "trayTemplate.png");

// Identify as "Mawaqeet" (not "Electron") in notifications and the menu.
app.setName("Mawaqeet");
if (process.platform === "darwin") {
  app.setAboutPanelOptions({ applicationName: "Mawaqeet" });
}

// ------------------------------------------------------- update checker ---
// Lightweight, signing-independent: checks the latest GitHub release and, if
// newer, notifies the user in-app with a Download link. (Full silent
// auto-update via electron-updater can replace this once macOS is signed.)
const REPO = "CodeNKoffee/mawaqeet";
let updateInfo = null;

function isNewerVersion(latestTag, current) {
  const a = String(latestTag).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const b = String(current).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

async function checkForUpdates() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { "User-Agent": "Mawaqeet", Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.tag_name && isNewerVersion(data.tag_name, app.getVersion())) {
      updateInfo = {
        available: true,
        latest: String(data.tag_name).replace(/^v/, ""),
        url: data.html_url || `https://github.com/${REPO}/releases/latest`,
      };
      pushState();
      notify({
        title: `Mawaqeet ${updateInfo.latest} is available`,
        body: "Open Mawaqeet to download the update.",
      });
    }
  } catch (_) {
    /* offline / rate-limited — ignore silently */
  }
}

let tray = null;
let mainWindow = null;
let settingsWindow = null;
let trayTick = null;

// ---------------------------------------------------------------- windows ---

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 460,
    height: 680,
    resizable: false,
    fullscreenable: false,
    title: "Mawaqeet",
    icon: ICON_PNG,
    backgroundColor: "#0f2747",
    titleBarStyle: "hiddenInset",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "..", "src", "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", (e) => {
    // Keep running in the menu bar instead of quitting.
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 560,
    height: 720,
    resizable: true,
    title: "Mawaqeet — Settings",
    icon: ICON_PNG,
    backgroundColor: "#0f2747",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWindow.loadFile(path.join(__dirname, "..", "src", "settings.html"));
  settingsWindow.on("closed", () => (settingsWindow = null));
}

// ------------------------------------------------------------------- tray ---

function fmtCountdown(ms) {
  if (ms == null) return "";
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = total % 60;
  return m > 0 ? `${m}m` : `${s}s`;
}

function updateTray() {
  if (!tray) return;
  const st = scheduler.getDayState();
  if (st.hasLocation && st.next) {
    tray.setTitle(` ${st.next.name} ${fmtCountdown(st.next.msUntil)}`);
    tray.setToolTip(`Next: ${st.next.name} at ${new Date(st.next.iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: !store.getAll().general.use24h })}`);
  } else {
    tray.setTitle(" Mawaqeet");
    tray.setToolTip("Set your location in Mawaqeet");
  }
}

function buildTrayMenu() {
  const st = scheduler.getDayState();
  const items = [];
  if (st.hasLocation) {
    items.push({ label: `📍 ${st.location.city || "Location"}`, enabled: false });
    items.push({ type: "separator" });
    for (const key of ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]) {
      const t = st.times[key];
      const label = t.label.en.padEnd(9, " ");
      const time = new Date(t.iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: !store.getAll().general.use24h });
      const isNext = st.next && st.next.key === key;
      items.push({ label: `${isNext ? "→ " : "   "}${label} ${time}`, enabled: false });
    }
    items.push({ type: "separator" });
  }
  items.push({ label: "Open Mawaqeet", click: createMainWindow });
  items.push({ label: "Settings…", click: createSettingsWindow });
  items.push({
    label: "Preview blocker (1 min)",
    click: () => scheduler.preview("dhuhr"),
  });
  items.push({ type: "separator" });
  items.push({
    label: "Quit Mawaqeet",
    click: () => {
      app.isQuitting = true;
      app.quit();
    },
  });
  return Menu.buildFromTemplate(items);
}

function createTray() {
  // A monochrome silhouette template + a text countdown in the menu bar.
  let img;
  try {
    img = nativeImage.createFromPath(TRAY_ICON);
    if (process.platform === "darwin") img.setTemplateImage(true);
  } catch (_) {
    img = nativeImage.createEmpty();
  }
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setTitle(" Mawaqeet");
  tray.on("click", () => {
    tray.popUpContextMenu(buildTrayMenu());
  });
  tray.on("right-click", () => {
    tray.popUpContextMenu(buildTrayMenu());
  });
  updateTray();
  trayTick = setInterval(updateTray, 1000);
}

// -------------------------------------------------------------- app glue ---

function notify({ title, body }) {
  if (!Notification.isSupported()) return;
  try {
    new Notification({
      title,
      body,
      icon: nativeImage.createFromPath(ICON_PNG),
      silent: false,
    }).show();
  } catch (_) {}
}

function pushState() {
  const st = scheduler.getDayState();
  st.update = updateInfo;
  for (const w of [mainWindow, settingsWindow]) {
    if (w && !w.isDestroyed()) w.webContents.send("state", st);
  }
  updateTray();
}

function getSettings() {
  return store.getAll();
}

function startBlocker(info) {
  blocker.start(info);
}

async function ensureLocation() {
  const s = store.getAll();
  if (s.location && s.location.lat != null) return;
  const loc = await geo.detectLocation();
  if (loc) {
    store.patch({ location: loc });
  }
}

// --------------------------------------------------------------- IPC API ---

function registerIpc() {
  ipcMain.handle("state:get", () => ({ ...scheduler.getDayState(), update: updateInfo }));

  ipcMain.handle("app:openExternal", (_e, url) => {
    if (
      typeof url === "string" &&
      /^https:\/\/(github\.com\/CodeNKoffee\/mawaqeet|codenkoffee\.github\.io\/mawaqeet)/.test(url)
    ) {
      shell.openExternal(url);
    }
  });

  ipcMain.handle("settings:get", () => store.getAll());
  ipcMain.handle("settings:set", (_e, patch) => {
    const next = store.patch(patch);
    if (patch.general && typeof patch.general.launchAtLogin === "boolean") {
      app.setLoginItemSettings({ openAtLogin: patch.general.launchAtLogin });
    }
    scheduler.plan();
    pushState();
    return next;
  });

  ipcMain.handle("geo:detect", async () => {
    const loc = await geo.detectLocation();
    if (loc) {
      store.patch({ location: loc });
      scheduler.plan();
      pushState();
    }
    return loc;
  });
  ipcMain.handle("geo:search", (_e, q) => geo.searchCity(q));
  ipcMain.handle("location:set", (_e, loc) => {
    store.patch({ location: { ...loc, source: "manual" } });
    scheduler.plan();
    pushState();
    return store.getAll().location;
  });

  ipcMain.handle("events:add", (_e, ev) => {
    const events = store.store.get("events") || [];
    ev.id = ev.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    events.push(ev);
    store.store.set("events", events);
    scheduler.plan();
    pushState();
    return events;
  });
  ipcMain.handle("events:update", (_e, ev) => {
    const events = (store.store.get("events") || []).map((x) => (x.id === ev.id ? ev : x));
    store.store.set("events", events);
    scheduler.plan();
    pushState();
    return events;
  });
  ipcMain.handle("events:remove", (_e, id) => {
    const events = (store.store.get("events") || []).filter((x) => x.id !== id);
    store.store.set("events", events);
    scheduler.plan();
    pushState();
    return events;
  });

  ipcMain.handle("verses:all", () => verses.all());

  ipcMain.handle("blocker:info", () => blocker.getInfo());
  ipcMain.handle("blocker:unlock", (_e, passphrase) => {
    const expected = store.getAll().blocker.passphrase;
    const info = blocker.getInfo();
    const res = blocker.emergencyUnlock(passphrase, expected);
    if (res.ok && info) store.logUnlock(info.prayerName);
    return res;
  });
  ipcMain.handle("blocker:dismiss", () => blocker.dismiss());
  ipcMain.handle("blocker:preview", (_e, key) => scheduler.preview(key || "dhuhr"));

  ipcMain.handle("window:settings", () => createSettingsWindow());
  ipcMain.handle("app:quit", () => {
    app.isQuitting = true;
    app.quit();
  });
}

// --------------------------------------------------------------- startup ---

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => createMainWindow());

  app.whenReady().then(async () => {
    if (process.platform === "darwin") app.dock.hide(); // menu-bar app

    registerIpc();

    blocker.onEnd(() => {
      pushState();
    });

    await ensureLocation();

    scheduler.init({
      getSettings,
      notify,
      startBlocker,
      isBlockerActive: blocker.isActive,
      blockerIsPreview: blocker.isPreview,
      endBlocker: blocker.end,
      pushState,
    });

    createTray();

    // Update checks: shortly after launch, then every 6 hours.
    setTimeout(checkForUpdates, 5000);
    setInterval(checkForUpdates, 6 * 60 * 60 * 1000);

    // Show the dashboard on first run (no location, not yet onboarded) or in dev.
    const s = store.getAll();
    if (!s.location || isDev || !s.general.onboarded) createMainWindow();
  });

  app.on("window-all-closed", (e) => {
    // Stay alive in the menu bar.
  });

  app.on("before-quit", () => {
    app.isQuitting = true;
    if (trayTick) clearInterval(trayTick);
  });
}
