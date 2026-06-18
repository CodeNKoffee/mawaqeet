// Settings renderer.
const $ = (id) => document.getElementById(id);

const METHODS = {
  auto: "Auto by location",
  MuslimWorldLeague: "Muslim World League",
  Egyptian: "Egyptian General Authority",
  Karachi: "Univ. of Islamic Sciences, Karachi",
  UmmAlQura: "Umm al-Qura, Makkah",
  Dubai: "Dubai",
  MoonsightingCommittee: "Moonsighting Committee",
  NorthAmerica: "ISNA (North America)",
  Kuwait: "Kuwait",
  Qatar: "Qatar",
  Singapore: "Singapore",
  Tehran: "Univ. of Tehran",
  Turkey: "Diyanet (Turkey)",
  Other: "Other / Custom",
};
const PRAYERS = [
  ["fajr", "Fajr", "الفجر"],
  ["dhuhr", "Dhuhr", "الظهر"],
  ["asr", "Asr", "العصر"],
  ["maghrib", "Maghrib", "المغرب"],
  ["isha", "Isha", "العشاء"],
];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

let S = null;
let evType = "once";
let evDays = new Set();
// custom-control instances
let C = {};

const save = (patch) => window.mawaqeet.setSettings(patch).then((s) => (S = s));

// ---------------- build custom controls ----------------
function buildControls() {
  const methodOpts = Object.entries(METHODS).map(([value, label]) => ({ value, label }));
  C.method = UI.select({
    options: methodOpts,
    value: S.calc.method,
    onChange: (v) => save({ calc: { method: v } }),
  });
  $("methodMount").appendChild(C.method);

  C.madhab = UI.select({
    options: [
      { value: "shafi", label: "Standard (Shafi'i / Maliki / Hanbali)" },
      { value: "hanafi", label: "Hanafi" },
    ],
    value: S.calc.madhab,
    onChange: (v) => save({ calc: { madhab: v } }),
  });
  $("madhabMount").appendChild(C.madhab);

  C.duration = UI.number({
    value: S.blocker.durationMin,
    min: 1,
    max: 60,
    onChange: (v) => save({ blocker: { durationMin: v } }),
  });
  $("durationMount").appendChild(C.duration);

  C.delay = UI.number({
    value: S.blocker.delaySec,
    min: 0,
    max: 600,
    step: 5,
    onChange: (v) => save({ blocker: { delaySec: v } }),
  });
  $("delayMount").appendChild(C.delay);

  C.pre = UI.number({
    value: S.notifications.preReminderMin,
    min: 0,
    max: 60,
    onChange: (v) => save({ notifications: { preReminderMin: v } }),
  });
  $("preMount").appendChild(C.pre);

  C.timeFormat = UI.select({
    options: [
      { value: "12", label: "12-hour (1:07 PM)" },
      { value: "24", label: "24-hour (13:07)" },
    ],
    value: S.general.use24h ? "24" : "12",
    onChange: (v) => save({ general: { use24h: v === "24" } }),
  });
  $("timeFormatMount").appendChild(C.timeFormat);

  // event date/time pickers
  C.evDate = UI.date({ value: new Date() });
  $("evDateMount").appendChild(C.evDate);
  C.evStart = UI.time({ value: "09:00" });
  $("evStartMount").appendChild(C.evStart);
  C.evEnd = UI.time({ value: "10:00" });
  $("evEndMount").appendChild(C.evEnd);
  C.evRStart = UI.time({ value: "09:00" });
  $("evRStartMount").appendChild(C.evRStart);
  C.evREnd = UI.time({ value: "10:00" });
  $("evREndMount").appendChild(C.evREnd);
}

function fillPrayerToggles() {
  const wrap = $("prayerToggles");
  wrap.innerHTML = "";
  for (const [key, en, ar] of PRAYERS) {
    const row = document.createElement("label");
    row.className = "pt";
    row.innerHTML = `<span class="nm"><span>${en}</span><span class="ar">${ar}</span></span>`;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "switch";
    cb.checked = !!S.prayers[key];
    cb.addEventListener("change", () => save({ prayers: { [key]: cb.checked } }));
    row.appendChild(cb);
    wrap.appendChild(row);
  }
}

function fillDays() {
  const wrap = $("evDays");
  wrap.innerHTML = "";
  DAYS.forEach((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = d;
    b.addEventListener("click", () => {
      if (evDays.has(i)) {
        evDays.delete(i);
        b.classList.remove("on");
      } else {
        evDays.add(i);
        b.classList.add("on");
      }
    });
    wrap.appendChild(b);
  });
}

function renderEvents() {
  const wrap = $("eventsList");
  wrap.innerHTML = "";
  for (const ev of S.events || []) {
    const div = document.createElement("div");
    div.className = "event";
    let meta = "";
    if (ev.type === "once" && ev.once) {
      const s = new Date(ev.once.startISO);
      const e = new Date(ev.once.endISO);
      meta = `${s.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} → ${e.toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" }
      )}`;
    } else if (ev.recur) {
      const days = ev.recur.days.map((d) => DAYS[d]).join(" ");
      meta = `${days} · ${ev.recur.start}–${ev.recur.end}`;
    }
    div.innerHTML = `<div><div class="ev-title">${ev.title || "Event"}</div><div class="meta">${meta}</div></div>`;
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "✕";
    del.addEventListener("click", async () => {
      S.events = await window.mawaqeet.removeEvent(ev.id);
      renderEvents();
    });
    div.appendChild(del);
    wrap.appendChild(div);
  }
}

function populate() {
  $("curLoc").textContent = S.location
    ? "📍 " + [S.location.city, S.location.country].filter(Boolean).join(", ")
    : "No location set";

  C.method.setValue(S.calc.method);
  C.madhab.setValue(S.calc.madhab);
  C.duration.setValue(S.blocker.durationMin);
  C.delay.setValue(S.blocker.delaySec);
  C.pre.setValue(S.notifications.preReminderMin);
  C.timeFormat.setValue(S.general.use24h ? "24" : "12");

  $("blockerEnabled").checked = S.blocker.enabled;
  $("passphrase").value = S.blocker.passphrase;
  $("showVerse").checked = S.blocker.showVerse;
  setStrictness(S.blocker.strictness);

  $("azaan").checked = S.notifications.azaan;
  $("deferAfter").checked = S.general.deferBlockerAfterEvent;
  $("launchLogin").checked = S.general.launchAtLogin;

  fillPrayerToggles();
  renderEvents();
}

function setStrictness(val) {
  $("strictness")
    .querySelectorAll(".pill")
    .forEach((p) => p.classList.toggle("sel", p.dataset.value === val));
  $("passField").style.display = val === "strict" ? "" : "none";
}

// ---------------- wiring ----------------
function wire() {
  $("blockerEnabled").addEventListener("change", (e) => save({ blocker: { enabled: e.target.checked } }));

  $("strictness")
    .querySelectorAll(".pill")
    .forEach((p) =>
      p.addEventListener("click", async () => {
        await save({ blocker: { strictness: p.dataset.value } });
        setStrictness(p.dataset.value);
      })
    );
  $("passphrase").addEventListener("change", (e) => save({ blocker: { passphrase: e.target.value } }));
  $("showVerse").addEventListener("change", (e) => save({ blocker: { showVerse: e.target.checked } }));
  $("previewBtn").addEventListener("click", () => window.mawaqeet.previewBlocker("dhuhr"));

  $("azaan").addEventListener("change", (e) => save({ notifications: { azaan: e.target.checked } }));
  $("deferAfter").addEventListener("change", (e) => save({ general: { deferBlockerAfterEvent: e.target.checked } }));
  $("launchLogin").addEventListener("change", (e) => save({ general: { launchAtLogin: e.target.checked } }));
  $("quitBtn").addEventListener("click", () => window.mawaqeet.quit());

  $("detectBtn").addEventListener("click", async () => {
    $("detectBtn").textContent = "Detecting…";
    await window.mawaqeet.detectLocation();
    S = await window.mawaqeet.getSettings();
    $("detectBtn").textContent = "Re-detect";
    populate();
  });

  let st;
  $("cityInput").addEventListener("input", (e) => {
    clearTimeout(st);
    const q = e.target.value;
    st = setTimeout(async () => {
      const res = await window.mawaqeet.searchCity(q);
      const box = $("cityResults");
      box.innerHTML = "";
      for (const r of res) {
        const b = document.createElement("button");
        b.className = "opt";
        b.textContent = r.label;
        b.addEventListener("click", async () => {
          await window.mawaqeet.setLocation(r);
          S = await window.mawaqeet.getSettings();
          box.innerHTML = "";
          $("cityInput").value = "";
          populate();
        });
        box.appendChild(b);
      }
    }, 300);
  });

  $("evType")
    .querySelectorAll("button")
    .forEach((b) =>
      b.addEventListener("click", () => {
        evType = b.dataset.type;
        $("evType").querySelectorAll("button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        $("onceFields").hidden = evType !== "once";
        $("recurFields").hidden = evType !== "recurring";
      })
    );

  $("addEvBtn").addEventListener("click", addEvent);
}

function combine(dateObj, hm) {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date(dateObj);
  d.setHours(h, m, 0, 0);
  return d;
}

async function addEvent() {
  const title = $("evTitle").value.trim() || "Event";
  let ev;
  if (evType === "once") {
    const d = C.evDate.getValue();
    if (!d) return alert("Pick a date.");
    let start = combine(d, C.evStart.getValue());
    let end = combine(d, C.evEnd.getValue());
    if (end <= start) end.setDate(end.getDate() + 1); // crosses midnight
    ev = {
      title,
      type: "once",
      enabled: true,
      once: { startISO: start.toISOString(), endISO: end.toISOString() },
    };
  } else {
    if (evDays.size === 0) return alert("Pick at least one weekday.");
    ev = {
      title,
      type: "recurring",
      enabled: true,
      recur: { days: [...evDays].sort(), start: C.evRStart.getValue(), end: C.evREnd.getValue() },
    };
  }
  S.events = await window.mawaqeet.addEvent(ev);
  $("evTitle").value = "";
  evDays.clear();
  document.querySelectorAll("#evDays button").forEach((b) => b.classList.remove("on"));
  renderEvents();
}

async function init() {
  S = await window.mawaqeet.getSettings();
  buildControls();
  fillDays();
  populate();
  wire();

  const verses = await window.mawaqeet.versesAll();
  $("srcNote").textContent = `Arabic: Uthmani script · English: Sahih International · ${verses.length} verified verses · source alquran.cloud`;
}

init();
