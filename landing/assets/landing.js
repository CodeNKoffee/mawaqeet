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
