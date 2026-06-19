# Mawaqeet Mobile (Capacitor) — plan & shell

> This branch (`mobile`) holds the iOS / iPadOS / Android shell. It is kept
> separate from `main` (the desktop Electron app) until it's ready.

## Strategy

Reuse the **exact same renderer UI** in `src/` (HTML/CSS/JS). The UI only talks
to the OS through `window.mawaqeet` (defined by Electron's `preload.js` on
desktop). On mobile we provide a **drop-in replacement bridge**,
`src/js/bridge-capacitor.js`, implemented with Capacitor plugins — so the
dashboard, settings, and blocker screens render identically with zero UI rewrite.

```
src/ (shared UI)  ──>  window.mawaqeet
                        ├── desktop: electron/preload.js  (IPC → main process)
                        └── mobile : src/js/bridge-capacitor.js (Capacitor plugins)
```

## ⚠️ The screen-blocker on mobile (important, honest)

The hard, can't-escape blocker is a **desktop-only** capability.

- **iOS / iPadOS:** Apple's sandbox forbids any app from covering other apps or
  locking the device. The blocker degrades to: a **Local Notification** at the
  azaan + a **full-screen reminder while the app is open**. Optional deeper
  integration: ship a **Shortcuts** action / Focus filter the user wires up
  themselves, or a Screen Time companion — but nothing can force a lock.
- **Android:** a real overlay **is** possible via the `SYSTEM_ALERT_WINDOW`
  ("Display over other apps") permission — we can draw the blocker over other
  apps and a foreground service to keep it alive. This is the closest to the
  desktop experience.

The marketing/FAQ already states this; keep it accurate in stores.

## Plugins

| Need | Plugin |
| --- | --- |
| Azaan + pre-reminders | `@capacitor/local-notifications` |
| Persist settings | `@capacitor/preferences` |
| Location (with permission prompt) | `@capacitor/geolocation` |
| Open release/links | `@capacitor/browser` |
| App lifecycle / resume | `@capacitor/app` |
| Android overlay blocker | custom plugin or community `SYSTEM_ALERT_WINDOW` |

Prayer-time math runs **on-device** with the existing `adhan` dependency,
scheduled as local notifications (compute the day's times, schedule 5 + the
pre-reminders; reschedule on app resume and at midnight).

## One-time setup

```bash
# on the mobile branch
npm install @capacitor/core @capacitor/cli \
  @capacitor/ios @capacitor/android \
  @capacitor/local-notifications @capacitor/preferences \
  @capacitor/geolocation @capacitor/browser @capacitor/app

npx cap init Mawaqeet com.mawaqeet.app --web-dir=src   # config already committed
npx cap add ios
npx cap add android
```

## Build / run

```bash
npx cap sync            # copy web assets + plugins into native projects
npx cap open ios        # → Xcode  (needs Apple Developer account to run on device)
npx cap open android    # → Android Studio
```

## Work checklist

- [ ] `src/js/bridge-capacitor.js` — implement `window.mawaqeet` (see the stub:
      `getState`, `getSettings/setSettings`, `detectLocation/searchCity/setLocation`,
      `versesAll`, events, and the mobile blocker behavior).
- [ ] Load the right bridge per platform: in each HTML, load
      `bridge-capacitor.js` only when not under Electron (guard on
      `window.mawaqeet` like the dev-mock does), or build a mobile-specific
      `index` that includes it.
- [ ] Schedule prayer-time local notifications with `adhan`.
- [ ] iOS: full-screen reminder view while app is open; wire the
      meeting/interview exception to suppress reminders.
- [ ] Android: implement the `SYSTEM_ALERT_WINDOW` overlay blocker + foreground
      service; request the overlay permission on first run.
- [ ] App icons / splash via `@capacitor/assets` (reuse `build/icon.png`).
- [ ] Store listings (App Store / Play) — note the blocker limitation honestly.

## Notes

- `webDir` is `src` so Capacitor serves the shared UI directly.
- Keep desktop (`main`) and mobile (`mobile`) in sync on the shared `src/` UI;
  only the bridge differs.
