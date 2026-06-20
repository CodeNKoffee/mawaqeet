// Smoothly expand/collapse the opt-in Qur'an verse.
(function () {
  const toggle = document.getElementById("verseToggle");
  const body = document.getElementById("verseBody");
  if (!toggle || !body) return;

  toggle.addEventListener("click", () => {
    const open = !body.classList.contains("open");
    body.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.classList.add("tapped"); // stop the attention nudge once used
  });
})();

// Hero download button — detect the visitor's OS and offer the matching build.
(function () {
  const a = document.getElementById("heroDl");
  if (!a) return;
  const text = document.getElementById("heroDlText");
  const icon = document.getElementById("heroDlIcon");
  const VER = "v0.1.1";
  const base = "https://github.com/CodeNKoffee/mawaqeet/releases/download/" + VER + "/";
  const ua = navigator.userAgent || "";
  const plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";

  if (/Android|iPhone|iPad|iPod/i.test(ua)) {
    // No mobile build yet — send them to the downloads page.
    a.href = "downloads.html";
    text.textContent = "See downloads";
    icon.className = "fa-solid fa-download";
  } else if (/Win/i.test(plat) || /Windows/i.test(ua)) {
    a.href = base + "Mawaqeet-0.1.1-Windows-x64.exe";
    text.textContent = "Download for Windows";
    icon.className = "fa-brands fa-windows";
  } else if (/Linux/i.test(plat) || (/Linux/i.test(ua) && !/Android/i.test(ua))) {
    a.href = base + "Mawaqeet-0.1.1.AppImage";
    text.textContent = "Download for Linux";
    icon.className = "fa-brands fa-linux";
  }
  // macOS is the default already set in the HTML.
})();
