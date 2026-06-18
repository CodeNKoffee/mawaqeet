// Persistent settings (electron-store v8, CommonJS).
const Store = require("electron-store");

const defaults = {
  location: null, // { lat, lng, city, country, countryCode, timezone, source }

  calc: {
    method: "auto", // "auto" | adhan method name
    madhab: "shafi", // "shafi" | "hanafi"
  },

  // Which prayers should trigger the focus blocker.
  prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },

  blocker: {
    enabled: true,
    durationMin: 15, // how long the screen stays blocked after azaan
    delaySec: 0, // grace period after azaan before the block engages
    strictness: "strict", // "strict" | "hard" | "soft"
    passphrase: "bismillah", // emergency unlock phrase (strict mode only)
    showVerse: true, // show a Qur'an verse (Arabic + English) on the blocker
  },

  notifications: {
    azaan: true, // notify at prayer time
    preReminderMin: 10, // also notify N minutes before (0 = off)
  },

  // Meeting / interview exceptions. While an event is active the blocker is
  // suppressed; if a prayer's block was due during the event it fires the
  // moment the event ends (deferred catch-up).
  events: [],
  // event shape:
  // { id, title, type:"once"|"recurring",
  //   once:  { startISO, endISO },
  //   recur: { days:[0..6], start:"HH:MM", end:"HH:MM" },
  //   enabled:true }

  general: {
    launchAtLogin: false,
    deferBlockerAfterEvent: true, // fire the missed block right after event ends
    use24h: false, // 24-hour vs 12-hour clock display
  },

  // Audit trail of emergency unlocks (keeps you honest).
  unlockLog: [], // { atISO, prayer }
};

const store = new Store({ name: "mawaqeet-settings", defaults });

function getAll() {
  return {
    location: store.get("location"),
    calc: store.get("calc"),
    prayers: store.get("prayers"),
    blocker: store.get("blocker"),
    notifications: store.get("notifications"),
    events: store.get("events"),
    general: store.get("general"),
  };
}

// Shallow-merge a patch object into the store (one level deep per section).
function patch(p) {
  for (const [k, v] of Object.entries(p || {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      store.set(k, { ...(store.get(k) || {}), ...v });
    } else {
      store.set(k, v);
    }
  }
  return getAll();
}

function logUnlock(prayer) {
  const log = store.get("unlockLog") || [];
  log.unshift({ atISO: new Date().toISOString(), prayer });
  store.set("unlockLog", log.slice(0, 200));
}

module.exports = { store, getAll, patch, logUnlock, defaults };
