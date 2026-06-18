// Dashboard renderer.
const $ = (id) => document.getElementById(id);
const ORDER = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

let state = null;
let use24h = false;

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: !use24h });
}
function fmtHMS(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

function render() {
  if (!state) return;

  if (!state.hasLocation) {
    $("setup").hidden = false;
    $("content").hidden = true;
    return;
  }
  $("setup").hidden = true;
  $("content").hidden = false;

  use24h = !!(state.settings && state.settings.general && state.settings.general.use24h);
  const loc = state.location;
  $("locText").textContent = "📍 " + [loc.city, loc.country].filter(Boolean).join(", ");
  try {
    $("hijriText").textContent = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch (_) {
    $("hijriText").textContent = "";
  }

  $("nextName").textContent = state.next.name;
  $("nextAr").textContent = state.next.arabic;
  $("nextAt").textContent =
    fmtTime(state.next.iso) + (state.next.tomorrow ? " (tomorrow)" : "");

  // event / deferral banner
  const banner = $("eventBanner");
  if (state.deferred) {
    banner.hidden = false;
    banner.textContent = `${state.deferred.name} is in. The screen will block right after your current event ends.`;
  } else if (state.activeEvent) {
    banner.hidden = false;
    banner.textContent = `In "${state.activeEvent.title}" until ${fmtTime(
      state.activeEvent.endISO
    )} — focus blocker paused.`;
  } else {
    banner.hidden = true;
  }

  // times list
  const now = Date.now();
  const list = $("timesList");
  list.innerHTML = "";
  for (const key of ORDER) {
    const t = state.times[key];
    const li = document.createElement("li");
    const isNext = state.next.key === key && key !== "sunrise";
    const passed = new Date(t.iso).getTime() < now && !isNext;
    if (isNext) li.classList.add("next");
    if (passed) li.classList.add("passed");
    if (key === "sunrise") li.classList.add("sunrise");
    li.innerHTML = `<span class="pname"><span class="en">${t.label.en}</span><span class="ar">${t.label.ar}</span></span><span class="ptime">${fmtTime(
      t.iso
    )}</span>`;
    list.appendChild(li);
  }

  $("focusState").textContent =
    "Focus mode: " + (state.settings.blocker.enabled ? "on" : "off");
}

function tickHero() {
  if (!state || !state.hasLocation) return;
  const ms = new Date(state.next.iso).getTime() - Date.now();
  $("nextCount").textContent = fmtHMS(ms);
  if (ms <= 0) refresh(); // rolled over
}

async function refresh() {
  state = await window.mawaqeet.getState();
  render();
}

// ----- location setup -----
let searchTimer = null;
function wireSetup() {
  $("detectBtn").addEventListener("click", async () => {
    $("detectBtn").textContent = "Detecting…";
    const loc = await window.mawaqeet.detectLocation();
    await refresh();
    if (!loc) $("detectBtn").textContent = "Couldn't detect — search below";
    else $("detectBtn").textContent = "Detect automatically";
  });
  $("cityInput").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value;
    searchTimer = setTimeout(async () => {
      const res = await window.mawaqeet.searchCity(q);
      const box = $("cityResults");
      box.innerHTML = "";
      for (const r of res) {
        const b = document.createElement("button");
        b.className = "opt";
        b.textContent = r.label;
        b.addEventListener("click", async () => {
          await window.mawaqeet.setLocation(r);
          await refresh();
        });
        box.appendChild(b);
      }
    }, 300);
  });
}

function wire() {
  $("gear").addEventListener("click", () => window.mawaqeet.openSettings());
  $("previewBtn").addEventListener("click", () => window.mawaqeet.previewBlocker("dhuhr"));
  wireSetup();
  window.mawaqeet.onState((s) => {
    state = s;
    render();
  });
}

wire();
refresh();
setInterval(tickHero, 1000);
