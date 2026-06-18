// Fullscreen focus-mode blocker. Puts an always-on-top cover window on EVERY
// display — including monitors plugged in DURING a block — so there is no
// second screen to escape to.
//
// macOS uses simpleFullScreen (covers menu bar + dock without spawning a new
// Space, which is the reliable way to do an overlay). Windows/Linux use kiosk.
//
// Strictness: soft (dismissible) · strict (logged passphrase exit) · hard (none).

const { BrowserWindow, screen, app } = require("electron");
const path = require("path");

let state = null;
let onEndCb = null;

function isActive() {
  return !!state;
}

function getInfo() {
  if (!state) return null;
  return {
    prayerKey: state.prayerKey,
    prayerName: state.prayerName,
    prayerArabic: state.prayerArabic,
    verse: state.verse,
    strictness: state.strictness,
    durationMs: state.durationMs,
    startedAt: state.startedAt,
    endsAt: state.startedAt + state.durationMs,
    use24h: state.use24h,
    preview: !!state.preview,
    next: state.next || null,
  };
}

function isPreview() {
  return !!(state && state.preview);
}

function buildWindow(display) {
  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    show: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: "#16335c",
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.__displayId = display.id;
  win.loadFile(path.join(__dirname, "..", "..", "src", "blocker.html"));

  win.once("ready-to-show", () => {
    win.setAlwaysOnTop(true, "screen-saver");
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    if (process.platform === "darwin") {
      win.setSimpleFullScreen(true);
    } else {
      win.setKiosk(true);
    }
    win.show();
    win.focus();
  });

  // Keep the cover on top WITHOUT stealing focus. Calling show()/focus() here
  // started a focus war between the per-monitor windows, which made the
  // Emergency-exit button unresponsive on multi-monitor setups. Re-asserting
  // the always-on-top level is enough — the window stays visually on top while
  // the clicked window keeps focus so its modal works.
  win.on("blur", () => {
    if (state && !state.ending && !win.isDestroyed()) {
      try {
        win.setAlwaysOnTop(true, "screen-saver");
      } catch (_) {}
    }
  });

  return win;
}

// Cover any display that doesn't yet have a window (handles hot-plugged monitors).
function coverAllDisplays() {
  if (!state) return;
  for (const d of screen.getAllDisplays()) {
    if (!state.windows.some((w) => !w.isDestroyed() && w.__displayId === d.id)) {
      state.windows.push(buildWindow(d));
    }
  }
}

function onDisplayChange() {
  coverAllDisplays();
}

function start({ prayerKey, prayerName, prayerArabic, verse, strictness, durationMs, use24h, preview, next }) {
  if (state) return getInfo();

  state = {
    prayerKey,
    prayerName,
    prayerArabic,
    verse,
    strictness,
    durationMs,
    use24h: !!use24h,
    preview: !!preview,
    next: next || null,
    startedAt: Date.now(),
    windows: [],
    ending: false,
    timer: null,
  };

  screen.getAllDisplays().forEach((d) => state.windows.push(buildWindow(d)));
  console.log(`[blocker] start: ${prayerName}, ${state.windows.length} window(s) across ${screen.getAllDisplays().length} display(s)`);

  // Keep covering monitors that appear (or change) mid-block.
  screen.on("display-added", onDisplayChange);
  screen.on("display-metrics-changed", onDisplayChange);

  if (process.platform === "darwin") {
    try {
      app.dock && app.dock.hide();
    } catch (_) {}
  }

  state.timer = setTimeout(() => end("timer"), durationMs);
  return getInfo();
}

function end(reason) {
  if (!state) return false;
  state.ending = true;
  if (state.timer) clearTimeout(state.timer);

  screen.removeListener("display-added", onDisplayChange);
  screen.removeListener("display-metrics-changed", onDisplayChange);

  for (const w of state.windows) {
    try {
      if (!w.isDestroyed()) {
        if (process.platform === "darwin" && w.isSimpleFullScreen()) {
          w.setSimpleFullScreen(false);
        }
        w.setClosable(true);
        w.destroy();
      }
    } catch (_) {}
  }

  const ended = { ...getInfo(), reason };
  state = null;
  if (onEndCb) onEndCb(ended);
  return true;
}

function dismiss() {
  if (!state) return false;
  // Preview and soft blocks are freely dismissible.
  if (state.preview || state.strictness === "soft") return end("dismissed");
  return false;
}

function emergencyUnlock(passphrase, expected) {
  if (!state) return { ok: false, reason: "inactive" };
  if (state.strictness === "hard") return { ok: false, reason: "hard" };
  if (state.strictness === "soft") {
    end("dismissed");
    return { ok: true };
  }
  const ok = (passphrase || "").trim().toLowerCase() === (expected || "").trim().toLowerCase();
  if (ok) end("emergency");
  return { ok };
}

function onEnd(cb) {
  onEndCb = cb;
}

module.exports = { start, end, dismiss, emergencyUnlock, isActive, isPreview, getInfo, onEnd };
