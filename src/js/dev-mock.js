// DEV-ONLY mock bridge so the renderer pages open in a plain browser (for
// previews/screenshots). Completely inert under Electron, where the real
// window.mawaqeet from preload.js already exists. Not referenced in production.
(function () {
  if (window.mawaqeet) return;

  const iso = (h, m) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const S = {
    location: { lat: 29.96, lng: 31.25, city: "Maadi", country: "Egypt", countryCode: "EG", source: "auto" },
    calc: { method: "auto", madhab: "shafi" },
    prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    blocker: { enabled: true, durationMin: 15, delaySec: 0, strictness: "strict", passphrase: "bismillah" },
    notifications: { azaan: true, preReminderMin: 10 },
    events: [
      { id: "ev1", title: "Client interview", type: "once", enabled: true, once: { startISO: iso(15, 0), endISO: iso(16, 0) } },
    ],
    general: { launchAtLogin: false, deferBlockerAfterEvent: true, use24h: false },
  };

  const verse = {
    arabic: "وَأَقِمِ ٱلصَّلَوٰةَ طَرَفَىِ ٱلنَّهَارِ وَزُلَفًۭا مِّنَ ٱلَّيْلِ ۚ إِنَّ ٱلْحَسَنَٰتِ يُذْهِبْنَ ٱلسَّيِّـَٔاتِ",
    english: "And establish prayer at the two ends of the day and at the approach of the night. Indeed, good deeds do away with misdeeds.",
    surahArabic: "سُورَةُ هُودٍ",
    surahEnglish: "Hud",
    ref: "11:114",
    juz: 12,
  };

  const state = {
    hasLocation: true,
    location: S.location,
    methodName: "Egyptian",
    times: {
      fajr: { iso: iso(4, 8), label: { en: "Fajr", ar: "الفجر" } },
      sunrise: { iso: iso(5, 54), label: { en: "Sunrise", ar: "الشروق" } },
      dhuhr: { iso: iso(12, 57), label: { en: "Dhuhr", ar: "الظهر" } },
      asr: { iso: iso(16, 31), label: { en: "Asr", ar: "العصر" } },
      maghrib: { iso: iso(19, 58), label: { en: "Maghrib", ar: "المغرب" } },
      isha: { iso: iso(21, 31), label: { en: "Isha", ar: "العشاء" } },
    },
    next: {
      key: "asr",
      name: "Asr",
      arabic: "العصر",
      iso: new Date(Date.now() + (2 * 3600 + 23 * 60 + 5) * 1000).toISOString(),
      msUntil: (2 * 3600 + 23 * 60 + 5) * 1000,
      tomorrow: false,
    },
    activeEvent: null,
    deferred: null,
    settings: S,
  };

  const merge = (t, p) => {
    for (const k in p) {
      if (p[k] && typeof p[k] === "object" && !Array.isArray(p[k])) merge((t[k] = t[k] || {}), p[k]);
      else t[k] = p[k];
    }
  };

  window.mawaqeet = {
    platform: "darwin",
    getState: async () => state,
    onState: () => () => {},
    getSettings: async () => S,
    setSettings: async (p) => (merge(S, p), S),
    detectLocation: async () => S.location,
    searchCity: async () => [
      { label: "Cairo, Egypt", city: "Cairo", country: "Egypt", countryCode: "EG", lat: 30, lng: 31 },
      { label: "Istanbul, Türkiye", city: "Istanbul", country: "Türkiye", countryCode: "TR", lat: 41, lng: 29 },
    ],
    setLocation: async (l) => ((S.location = l), l),
    addEvent: async (e) => (S.events.push({ ...e, id: "ev" + Date.now() }), S.events),
    updateEvent: async () => S.events,
    removeEvent: async (id) => ((S.events = S.events.filter((e) => e.id !== id)), S.events),
    versesAll: async () => new Array(14).fill(verse),
    blockerInfo: async () => ({
      prayerName: "Dhuhr", prayerArabic: "الظهر", strictness: "strict",
      durationMs: 900000, startedAt: Date.now(), endsAt: Date.now() + 882000, use24h: false,
      verse: null, // hero shows the blocker with the verse feature OFF
    }),
    blockerUnlock: async () => ({ ok: false }),
    blockerDismiss: () => {},
    previewBlocker: () => {},
    openSettings: () => {},
    quit: () => {},
  };
})();
