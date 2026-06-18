// One-off: renders the renderer pages (with the dev-mock bridge) in frameless
// offscreen windows and writes PNG screenshots for the landing page.
// Run:  electron electron/capture.js
const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const SHOTS = [
  { file: "index.html", out: "dashboard.png", w: 460, h: 700 },
  { file: "settings.html", out: "settings.png", w: 600, h: 980 },
  { file: "blocker.html", out: "blocker.png", w: 1280, h: 800 },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.on("window-all-closed", () => {}); // don't auto-quit between captures

async function loadWithRetry(win, file) {
  for (let i = 0; i < 3; i++) {
    try {
      await win.loadFile(file);
      return true;
    } catch (e) {
      await wait(400);
    }
  }
  return false;
}

app.whenReady().then(async () => {
  const dir = path.join(__dirname, "..", "landing", "assets", "shots");
  fs.mkdirSync(dir, { recursive: true });

  for (const s of SHOTS) {
    const win = new BrowserWindow({
      width: s.w,
      height: s.h,
      show: false,
      frame: false,
      backgroundColor: "#16335c",
      webPreferences: {
        preload: path.join(__dirname, "..", "src", "js", "dev-mock.js"),
        contextIsolation: false,
        nodeIntegration: false,
      },
    });
    const ok = await loadWithRetry(win, path.join(__dirname, "..", "src", s.file));
    if (!ok) {
      console.log("FAILED load", s.out);
      continue;
    }
    await wait(1600);
    try {
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(dir, s.out), img.toPNG());
      console.log("wrote", s.out);
    } catch (e) {
      console.log("FAILED capture", s.out, e.message);
    }
    win.hide();
  }

  app.quit();
});
