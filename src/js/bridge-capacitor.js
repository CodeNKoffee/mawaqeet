// Mobile bridge — the Capacitor implementation of `window.mawaqeet`, the same
// surface that electron/preload.js provides on desktop. Loading this on mobile
// lets the shared src/ UI run unchanged.
//
// STATUS: scaffold / WIP (see MOBILE.md). Wire up the Capacitor plugins + adhan
// where marked TODO. It is inert under Electron (real bridge already present).
//
// Expected bundling: this module imports adhan + Capacitor plugins, so the
// mobile build needs a bundler (Vite/esbuild) or import maps. On desktop it is
// simply not loaded.

(function () {
  if (window.mawaqeet) return; // desktop (preload) bridge already present

  // ---- lazy plugin handles (filled at build time) ---------------------------
  // import { Preferences } from "@capacitor/preferences";
  // import { LocalNotifications } from "@capacitor/local-notifications";
  // import { Geolocation } from "@capacitor/geolocation";
  // import { Browser } from "@capacitor/browser";
  // import adhan from "adhan";

  const KEY = "mawaqeet-settings";
  const DEFAULTS = {
    location: null,
    calc: { method: "auto", madhab: "shafi" },
    prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    blocker: { enabled: true, durationMin: 15, strictness: "soft", showVerse: false },
    notifications: { azaan: true, preReminderMin: 10 },
    events: [],
    general: { use24h: false, onboarded: false },
  };

  let settings = { ...DEFAULTS };

  async function load() {
    // const { value } = await Preferences.get({ key: KEY });
    // settings = value ? { ...DEFAULTS, ...JSON.parse(value) } : { ...DEFAULTS };
    return settings;
  }
  async function save() {
    // await Preferences.set({ key: KEY, value: JSON.stringify(settings) });
  }

  // ---- prayer times (on-device via adhan) -----------------------------------
  function computeState() {
    // const coords = new adhan.Coordinates(lat, lng);
    // const params = adhan.CalculationMethod[...]();  params.madhab = ...;
    // const pt = new adhan.PrayerTimes(coords, new Date(), params);
    // return { hasLocation, location, times, next, settings };  // same shape as desktop getDayState()
    return { hasLocation: !!settings.location, settings };
  }

  // ---- notifications: schedule azaan + pre-reminders -------------------------
  async function reschedule() {
    // await LocalNotifications.requestPermissions();
    // compute today's 5 prayers + pre-reminders, LocalNotifications.schedule(...)
  }

  // ---- the mobile "blocker" -------------------------------------------------
  // iOS: navigate to blocker.html as a full-screen view while the app is open.
  // Android: trigger the native SYSTEM_ALERT_WINDOW overlay (custom plugin).
  function startBlocker(info) {
    // mobile: show blocker.html full-screen (or native overlay on Android)
  }

  // ---- the window.mawaqeet surface (mirrors preload.js) ----------------------
  window.mawaqeet = {
    platform: "capacitor",
    getState: async () => (await load(), computeState()),
    onState: () => () => {},
    getSettings: async () => (await load(), settings),
    setSettings: async (patch) => {
      for (const k of Object.keys(patch)) settings[k] = { ...(settings[k] || {}), ...patch[k] };
      await save();
      await reschedule();
      return settings;
    },
    detectLocation: async () => {
      // const pos = await Geolocation.getCurrentPosition();  reverse-geocode → settings.location
      return settings.location;
    },
    searchCity: async (q) => {
      const r = await fetch(
        "https://geocoding-api.open-meteo.com/v1/search?count=8&name=" + encodeURIComponent(q)
      );
      const d = await r.json();
      return (d.results || []).map((x) => ({
        lat: x.latitude, lng: x.longitude, city: x.name, country: x.country,
        countryCode: x.country_code, label: [x.name, x.admin1, x.country].filter(Boolean).join(", "),
      }));
    },
    setLocation: async (loc) => ((settings.location = loc), await save(), await reschedule(), loc),
    addEvent: async (ev) => (settings.events.push(ev), await save(), settings.events),
    updateEvent: async () => settings.events,
    removeEvent: async (id) => ((settings.events = settings.events.filter((e) => e.id !== id)), await save(), settings.events),
    versesAll: async () => (await fetch("../data/verses.json").then((r) => r.json())).verses,
    blockerInfo: async () => null, // set when a mobile block is active
    blockerUnlock: async () => ({ ok: true }),
    blockerDismiss: () => {},
    previewBlocker: () => startBlocker({ preview: true }),
    openSettings: () => {},
    openExternal: async (url) => {
      /* await Browser.open({ url }); */ window.open(url, "_blank");
    },
    quit: () => {},
  };
})();
