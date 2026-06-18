// Drives the day: schedules azaan notifications, pre-reminders, and the
// focus blocker for each prayer. Handles the meeting/interview exception
// (defer the block until the event ends).

const prayer = require("./prayer");
const verses = require("./verses");

let deps = null; // { getSettings, notify, startBlocker, isBlockerActive, pushState }
let timers = [];
let pending = null; // deferred block waiting for an event to end
let replanTimer = null;

function clearTimers() {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
}

function at(date, fn) {
  const ms = date.getTime() - Date.now();
  if (ms < 0) return; // already passed today
  timers.push(setTimeout(fn, ms));
}

// ---- meeting / interview exception ---------------------------------------

function pad(n) {
  return String(n).padStart(2, "0");
}

function nowHM(d) {
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
}

// Returns the active event (and its end Date) right now, or null.
function activeEvent(now = new Date()) {
  const { events } = deps.getSettings();
  for (const ev of events || []) {
    if (ev.enabled === false) continue;
    if (ev.type === "once" && ev.once) {
      const s = new Date(ev.once.startISO);
      const e = new Date(ev.once.endISO);
      if (now >= s && now < e) return { ev, end: e };
    } else if (ev.type === "recurring" && ev.recur) {
      const day = now.getDay();
      if (!ev.recur.days.includes(day)) continue;
      const hm = nowHM(now);
      if (hm >= ev.recur.start && hm < ev.recur.end) {
        const [eh, em] = ev.recur.end.split(":").map(Number);
        const end = new Date(now);
        end.setHours(eh, em, 0, 0);
        return { ev, end };
      }
    }
  }
  return null;
}

// ---- prayer firing --------------------------------------------------------

function fireBlocker(key) {
  const s = deps.getSettings();
  if (!s.blocker.enabled || !s.prayers[key]) return;
  if (deps.isBlockerActive()) {
    // A preview is open → supersede it with the real block. A real block → leave it.
    if (deps.blockerIsPreview && deps.blockerIsPreview()) deps.endBlocker("superseded");
    else return;
  }

  const disp = prayer.DISPLAY[key];
  const verse = s.blocker.showVerse ? verses.pickForPrayer(key) : null;
  deps.startBlocker({
    prayerKey: key,
    prayerName: disp.en,
    prayerArabic: disp.ar,
    verse,
    strictness: s.blocker.strictness,
    durationMs: s.blocker.durationMin * 60 * 1000,
    use24h: s.general.use24h,
  });
}

function onPrayerHit(key) {
  const s = deps.getSettings();
  const disp = prayer.DISPLAY[key];

  if (s.notifications.azaan) {
    deps.notify({
      title: `It's time for ${disp.en} — ${disp.ar}`,
      body: "حَيَّ عَلَى الصَّلَاة · Hayya 'ala-ssalah",
    });
  }

  if (!s.blocker.enabled || !s.prayers[key]) {
    deps.pushState();
    return;
  }

  const engage = () => {
    const active = activeEvent();
    if (active && s.general.deferBlockerAfterEvent) {
      // Defer: prayer fell during a meeting/interview. Fire right after it ends.
      pending = { key, prayerName: disp.en };
      deps.notify({
        title: `${disp.en} is in — focus deferred`,
        body: `You're in "${active.ev.title}". The screen will block right after it ends so you can pray.`,
      });
      const ms = active.end.getTime() - Date.now();
      timers.push(setTimeout(firePending, Math.max(0, ms) + 1000));
      deps.pushState();
    } else {
      fireBlocker(key);
      deps.pushState();
    }
  };

  if (s.blocker.delaySec > 0) {
    timers.push(setTimeout(engage, s.blocker.delaySec * 1000));
  } else {
    engage();
  }
}

function firePending() {
  if (!pending) return;
  // Don't fire if another event is (still) active.
  if (activeEvent()) {
    const a = activeEvent();
    const ms = a.end.getTime() - Date.now();
    timers.push(setTimeout(firePending, Math.max(0, ms) + 1000));
    return;
  }
  const key = pending.key;
  pending = null;
  fireBlocker(key);
  deps.pushState();
}

// ---- planning -------------------------------------------------------------

function plan() {
  clearTimers();
  const s = deps.getSettings();
  if (!s.location) return;

  const args = {
    lat: s.location.lat,
    lng: s.location.lng,
    calc: s.calc,
    countryCode: s.location.countryCode,
  };
  const { times } = prayer.computeTimes(args);

  for (const key of prayer.PRAYER_ORDER) {
    const t = times[key];
    // azaan + blocker
    at(t, () => onPrayerHit(key));
    // pre-reminder
    if (s.notifications.preReminderMin > 0) {
      const pre = new Date(t.getTime() - s.notifications.preReminderMin * 60000);
      at(pre, () => {
        if (deps.getSettings().notifications.azaan) {
          deps.notify({
            title: `${prayer.DISPLAY[key].en} in ${s.notifications.preReminderMin} min`,
            body: "Wrap up — prayer is near.",
          });
        }
      });
    }
  }

  // Re-plan just after midnight for the new day.
  if (replanTimer) clearTimeout(replanTimer);
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 30, 0);
  replanTimer = setTimeout(plan, tomorrow.getTime() - Date.now());

  deps.pushState();
}

function getDayState() {
  const s = deps.getSettings();
  if (!s.location) return { hasLocation: false, settings: s };

  const args = {
    lat: s.location.lat,
    lng: s.location.lng,
    calc: s.calc,
    countryCode: s.location.countryCode,
  };
  const { times, methodName } = prayer.computeTimes(args);
  const next = prayer.nextPrayer(args);

  const ev = activeEvent();
  return {
    hasLocation: true,
    location: s.location,
    methodName,
    times: Object.fromEntries(
      Object.entries(times).map(([k, v]) => [
        k,
        { iso: v.toISOString(), label: prayer.DISPLAY[k] },
      ])
    ),
    next: {
      key: next.key,
      name: next.name,
      arabic: next.arabic,
      iso: next.time.toISOString(),
      msUntil: next.msUntil,
      tomorrow: next.tomorrow,
    },
    activeEvent: ev ? { title: ev.ev.title, endISO: ev.end.toISOString() } : null,
    deferred: pending ? { name: pending.prayerName } : null,
    settings: s,
  };
}

function init(d) {
  deps = d;
  plan();
}

// Manual preview for the "Preview blocker" button. Looks exactly like the real
// blocker but is freely dismissible and shows the countdown to the next salah.
// If a real prayer time arrives while it's open, the scheduler supersedes it
// with the real block (see fireBlocker).
function preview(key = "dhuhr") {
  const s = deps.getSettings();
  const disp = prayer.DISPLAY[key];

  let next = null;
  if (s.location) {
    const n = prayer.nextPrayer({
      lat: s.location.lat,
      lng: s.location.lng,
      calc: s.calc,
      countryCode: s.location.countryCode,
    });
    next = { name: n.name, arabic: n.arabic, iso: n.time.toISOString() };
  }

  deps.startBlocker({
    prayerKey: key,
    prayerName: disp.en,
    prayerArabic: disp.ar,
    verse: s.blocker.showVerse ? verses.pickForPrayer(key) : null,
    strictness: s.blocker.strictness,
    durationMs: 30 * 60 * 1000, // safety cap; preview is dismissible anytime
    use24h: s.general.use24h,
    preview: true,
    next,
  });
}

module.exports = { init, plan, getDayState, preview, activeEvent };
