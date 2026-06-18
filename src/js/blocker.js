// Renderer logic for the fullscreen focus blocker.
const $ = (id) => document.getElementById(id);

let info = null;
let use24h = false;
let holdTimer = null;
let holdStart = 0;
const HOLD_MS = 2500;

function fmtClock(d) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: !use24h });
}
function fmtMMSS(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function fmtHMS(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function tickClock() {
  const now = new Date();
  $("clock").textContent = fmtClock(now);
  $("lockDate").textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  if (info && info.preview && info.next) {
    const left = new Date(info.next.iso).getTime() - Date.now();
    $("countdown").textContent =
      left > 0 ? `Preview · ${info.next.name} in ${fmtHMS(left)}` : `Preview · ${info.next.name} now`;
  } else if (info && info.endsAt) {
    const left = info.endsAt - Date.now();
    $("countdown").textContent =
      left > 0 ? `Focus ends in ${fmtMMSS(left)}` : "Focus complete";
  }
}

function setupExit() {
  const area = $("exitArea");
  area.innerHTML = "";
  if (!info) return;

  // Preview is freely dismissible — no passphrase.
  if (info.preview) {
    const link = document.createElement("button");
    link.className = "exit-link";
    link.textContent = "Dismiss preview";
    link.addEventListener("click", () => window.mawaqeet.blockerDismiss());
    area.appendChild(link);
    return;
  }

  if (info.strictness === "hard") return; // no escape

  const link = document.createElement("button");
  link.className = "exit-link";
  link.textContent = info.strictness === "soft" ? "Dismiss" : "Emergency exit";
  link.addEventListener("click", () => {
    if (info.strictness === "soft") {
      window.mawaqeet.blockerDismiss();
    } else {
      openUnlock();
    }
  });
  area.appendChild(link);
}

// ----- emergency unlock (strict) -----
function openUnlock() {
  $("unlockModal").hidden = false;
  $("unlockErr").hidden = true;
  $("passInput").value = "";
}
function closeUnlock() {
  $("unlockModal").hidden = true;
  resetHold();
}
function resetHold() {
  if (holdTimer) cancelAnimationFrame(holdTimer);
  holdTimer = null;
  $("holdFill").style.width = "0%";
  $("passInput").disabled = true;
  $("confirmUnlock").disabled = true;
}
function holdLoop() {
  const pct = Math.min(100, ((Date.now() - holdStart) / HOLD_MS) * 100);
  $("holdFill").style.width = pct + "%";
  if (pct >= 100) {
    $("passInput").disabled = false;
    $("passInput").focus();
    holdTimer = null;
    return;
  }
  holdTimer = requestAnimationFrame(holdLoop);
}
function startHold() {
  if (!$("passInput").disabled) return; // already unlocked
  holdStart = Date.now();
  holdLoop();
}
function cancelHold() {
  if ($("passInput").disabled) {
    if (holdTimer) cancelAnimationFrame(holdTimer);
    holdTimer = null;
    $("holdFill").style.width = "0%";
  }
}

async function tryUnlock() {
  const res = await window.mawaqeet.blockerUnlock($("passInput").value);
  if (!res.ok) {
    const card = document.querySelector(".modal-card");
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
    $("unlockErr").hidden = false;
  }
  // on success the window is destroyed by main
}

function wireModal() {
  const hold = $("holdBtn");
  hold.addEventListener("mousedown", startHold);
  hold.addEventListener("mouseup", cancelHold);
  hold.addEventListener("mouseleave", cancelHold);
  $("passInput").addEventListener("input", () => {
    $("confirmUnlock").disabled = $("passInput").value.trim().length === 0;
  });
  $("passInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !$("confirmUnlock").disabled) tryUnlock();
  });
  $("confirmUnlock").addEventListener("click", tryUnlock);
  $("cancelUnlock").addEventListener("click", closeUnlock);
}

// block common escape shortcuts inside the window
function lockShortcuts() {
  window.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    const meta = e.metaKey || e.ctrlKey;
    // allow typing in the passphrase field
    if (e.target && e.target.id === "passInput") return;
    if (
      k === "escape" ||
      (meta && ["w", "q", "m", "h", "r", "tab"].includes(k)) ||
      (meta && e.altKey)
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

async function init() {
  lockShortcuts();
  wireModal();
  info = await window.mawaqeet.blockerInfo();
  if (!info) return;

  use24h = !!info.use24h;
  $("titleAr").textContent = info.prayerArabic || info.prayerName;
  $("blocker").classList.add("fade-in");

  // Hijri date under the clock
  try {
    $("lockHijri").textContent = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch (_) {
    $("lockHijri").textContent = "";
  }

  const v = info.verse;
  if (v) {
    $("arabic").textContent = v.arabic;
    $("quote").textContent = `“${v.english}”`;
    $("ref").textContent = `${v.surahArabic} · ${v.surahEnglish} ${v.ref}${
      v.juz ? " · Juz " + v.juz : ""
    }`;
  } else {
    $("arabic").style.display = "none";
    $("quote").style.display = "none";
    $("ref").style.display = "none";
  }

  setupExit();
  tickClock();
  setInterval(tickClock, 1000);
}

init();
