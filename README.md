# Mawaqeet · مواقيت

**Prayer that work can't push aside.** Mawaqeet is a prayer-times app with a
**focus-mode screen blocker**: at each prayer time it sounds the azaan and then
calmly takes over the screen for a set duration, so the prayer is never pushed
aside by a workload.

A commercial product, **free to download and use** (see [LICENSE](LICENSE)).

By **Hatem Soliman** · [Website](https://codenkoffee.github.io/mawaqeet/) · [Download](https://github.com/CodeNKoffee/mawaqeet/releases/latest)

### Platform status

| Platform | Status |
| --- | --- |
| **macOS** (Apple Silicon & Intel) | ✅ Available |
| **Windows** | 🛠️ In progress — buildable today (see below) |
| **Linux** (Ubuntu/AppImage) | 🛠️ In progress — buildable today (see below) |
| **iOS / iPadOS / Android** | 🗺️ Planned (Capacitor) |

> The hard screen-blocker is a **desktop** capability. On iOS/iPadOS, Apple's
> sandbox forbids locking the screen over other apps, so mobile will offer
> full-screen reminders + notifications instead (Android can use an overlay).

---

## Features

- **Accurate prayer times** via the [`adhan`](https://github.com/batoulapps/adhan-js) library. Auto-detects your country and picks the right calculation authority (Umm al-Qura, ISNA, Muslim World League, Egyptian, Karachi, …), or choose manually. Shafi'i / Hanafi Asr.
- **Focus-mode blocker** — a full-screen, always-on-top kiosk window on every display when a prayer comes in. Three strictness levels:
  - `strict` — blocks for the set time; a deliberate, logged passphrase exit exists for emergencies.
  - `hard` — no escape until the timer ends.
  - `soft` — a dismissible reminder.
- **Meeting / interview aware** — register one-time or recurring events; the blocker is suppressed during them and fires the moment the event ends, so you pray right after instead of being interrupted mid-meeting.
- **Verified Qur'an** — every ayah is shown in authentic **Uthmani** script with a **Sahih International** translation, set in the **Amiri Quran** typeface. Text is fetched verbatim (see `scripts/fetch-verses.mjs`), not transcribed by hand.
- **Menu-bar app** with a live countdown to the next prayer.

---

## Run (development)

Requires **Node 20+**.

```bash
npm install          # also runs scripts/patch-adhan.mjs (see Notes)
npm run fetch:verses # (optional) refresh data/verses.json
npm start            # launch the app
npm run dev          # launch and force-show the dashboard window
```

The landing page can be previewed with `node scripts/serve-landing.mjs` → http://localhost:5050.

## Build (distributables)

Icons live in `build/` (`icon.icns`, `icon.png`) and are auto-discovered by electron-builder.

### macOS

```bash
CSC_IDENTITY_AUTODISCOVERY=false npm run dist:mac   # .dmg + .zip
```

> Local builds are **unsigned**. For public distribution you need an Apple
> Developer ID to **sign & notarize** (otherwise Gatekeeper warns users). Once
> you have a certificate, drop `CSC_IDENTITY_AUTODISCOVERY=false` and set
> `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` for notarization.

### Windows  (build on Windows, or via CI)

electron-builder cannot produce a Windows installer from macOS reliably (it
needs the Windows toolchain / Wine). Two supported paths:

1. **On a Windows machine:** `npm install && npm run dist:win` → NSIS
   installer in `dist/`.
2. **Via GitHub Actions (recommended):** a `windows-latest` runner with
   `npm ci && npm run dist:win`. This is the cleanest cross-platform release
   path and also handles macOS + Linux in one workflow.

### Linux  (Ubuntu / AppImage / deb)

Best built **on Linux** (or Docker). On Ubuntu:

```bash
sudo apt-get install -y rpm fakeroot dpkg   # for .deb
npm install && npm run dist:linux           # AppImage + .deb in dist/
```

From macOS, AppImage *may* build but `.deb` needs `dpkg`/`fakeroot`; use the
official Docker image instead:

```bash
docker run --rm -v "$PWD":/project -w /project \
  electronuserland/builder:wine \
  /bin/bash -c "npm ci && npx electron-builder --linux AppImage deb"
```

> **CI is the recommended release pipeline** — one GitHub Actions workflow with
> `macos-latest`, `windows-latest`, and `ubuntu-latest` jobs produces all three
> platforms' artifacts from a single tag.

---

## Project layout

```
electron/            main process
  main.js              app lifecycle, tray, windows, IPC
  preload.js           contextBridge → window.mawaqeet
  lib/
    prayer.js          adhan wrapper (times, next prayer)
    methods.js         country → calculation-method map
    geo.js             IP geolocation + city search (keyless)
    verses.js          load + pick verses
    store.js           settings persistence (electron-store)
    blocker.js         fullscreen kiosk blocker windows
    scheduler.js       per-prayer timers + meeting-exception logic
src/                 renderer (plain HTML/CSS/JS — reusable on mobile)
  index.html           dashboard
  blocker.html         the focus-mode overlay
  settings.html        settings
  js/ui.js             custom select / calendar / time / stepper controls
  assets/              fonts (Amiri Quran, Playfair Display), pattern, css
data/verses.json     verified ayat (Uthmani + Sahih International)
landing/             marketing landing page (static, self-contained)
build/               app icons
```

---

## Cross-platform

The renderer (`src/`) is intentionally framework-free and talks to the OS only through `window.mawaqeet` (defined in `preload.js`). That keeps a clean seam:

- **Windows / Linux** — already covered by Electron + electron-builder targets above. The blocker, tray and notifications work the same.
- **iOS / iPadOS / Android** — wrap the same `src/` UI with **Capacitor**, replacing the preload bridge with a Capacitor-plugin implementation (local notifications + prayer-time calc on-device).
  - ⚠️ **iOS/iPadOS cannot truly block the screen.** Apple's sandbox forbids an app from forcing a persistent fullscreen lock over other apps. On iPhone/iPad the "blocker" degrades to a full-screen reminder while the app is open plus notifications (optionally wired to Screen Time / Shortcuts). The hard blocker is a **desktop** capability. Android can do a system overlay.

---

## Notes

- **adhan patch:** `adhan` declares `"type":"module"` but ships a CommonJS build in `lib/cjs/`, which breaks `require()` under Node ≥ 20. `scripts/patch-adhan.mjs` drops a `{"type":"commonjs"}` marker there and runs automatically on `postinstall`.
- **Location:** detection is IP-based (keyless, works on every OS, no permission prompt) with a manual city search fallback. It's city-accurate, not GPS-accurate — use the search if your detected city is off.
- **Sources:** Qur'an text from [alquran.cloud](https://alquran.cloud) (`quran-uthmani` + `en.sahih`). Fonts: [Amiri Quran](https://github.com/aliftype/amiri) & [Playfair Display](https://github.com/clauseggers/Playfair-Display) (OFL).

## License

Mawaqeet is **commercial software, free to use**, under a proprietary EULA —
see [LICENSE](LICENSE). You may use it (personally and commercially) at no cost,
but may not resell, redistribute commercially, or rebrand it.

Third-party components keep their own licenses: Electron & adhan-js (MIT),
Amiri Quran & Playfair Display fonts (SIL OFL 1.1), Qur'an Uthmani text (public
domain), English translation Sahih International.

_The LICENSE file is a template, not legal advice — have it reviewed before
commercial distribution._
