// Tiny custom-control library so we never fall back to native macOS/Chromium
// selects, calendars or time spinners. Exposes window.UI.
(function () {
  // Lift the enclosing card above its siblings so an open popover is never
  // clipped by the next glass card (each card is its own stacking context).
  function liftCard(el) {
    const c = el.closest(".card");
    if (c) c.classList.add("lift");
  }
  function dropCards() {
    document.querySelectorAll(".card.lift").forEach((c) => c.classList.remove("lift"));
  }

  function closeAllMenus() {
    document.querySelectorAll(".cs.open").forEach((el) => {
      el.classList.remove("open");
      const m = el.querySelector(".cs-menu");
      if (m) m.hidden = true;
    });
    document.querySelectorAll(".dp.open").forEach((el) => {
      el.classList.remove("open");
      const c = el.querySelector(".cal");
      if (c) c.hidden = true;
    });
    dropCards();
  }
  document.addEventListener("click", closeAllMenus);

  // ---- Select ----
  function select({ options, value, onChange, className }) {
    const el = document.createElement("div");
    el.className = "cs" + (className ? " " + className : "");
    let cur = value;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "cs-trigger";
    const lbl = document.createElement("span");
    lbl.className = "cs-label";
    const caret = document.createElement("span");
    caret.className = "cs-caret";
    caret.textContent = "▾";
    trigger.append(lbl, caret);

    const menu = document.createElement("div");
    menu.className = "cs-menu";
    menu.hidden = true;
    menu.addEventListener("click", (e) => e.stopPropagation());

    const labelFor = (v) => {
      const o = options.find((x) => x.value === v);
      return o ? o.label : "";
    };
    function renderOpts() {
      menu.innerHTML = "";
      for (const o of options) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "cs-opt" + (o.value === cur ? " sel" : "");
        b.textContent = o.label;
        b.addEventListener("click", () => {
          setValue(o.value);
          el.classList.remove("open");
          menu.hidden = true;
          onChange && onChange(o.value);
        });
        menu.appendChild(b);
      }
    }
    function setValue(v) {
      cur = v;
      lbl.textContent = labelFor(v);
      renderOpts();
    }
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = menu.hidden;
      closeAllMenus();
      if (willOpen) {
        el.classList.add("open");
        menu.hidden = false;
        liftCard(el);
      }
    });

    el.append(trigger, menu);
    setValue(cur);
    el.getValue = () => cur;
    el.setValue = setValue;
    return el;
  }

  // ---- Time picker (hour : minute AM/PM) ----
  function time({ value = "12:00", onChange }) {
    const wrap = document.createElement("div");
    wrap.className = "tp";
    let [H, M] = value.split(":").map(Number);
    const ampm0 = H >= 12 ? "PM" : "AM";
    let h12 = H % 12 || 12;

    const hours = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
    const mins = Array.from({ length: 60 }, (_, i) => {
      const s = String(i).padStart(2, "0");
      return { value: s, label: s };
    });
    const ap = [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }];

    const emit = () => onChange && onChange(get());
    const hSel = select({ options: hours, value: String(h12), onChange: emit });
    const sep = document.createElement("span");
    sep.className = "tp-sep";
    sep.textContent = ":";
    const mSel = select({ options: mins, value: String(M).padStart(2, "0"), onChange: emit });
    const aSel = select({ options: ap, value: ampm0, onChange: emit, className: "ampm" });
    wrap.append(hSel, sep, mSel, aSel);

    function get() {
      let hh = parseInt(hSel.getValue(), 10) % 12;
      if (aSel.getValue() === "PM") hh += 12;
      return String(hh).padStart(2, "0") + ":" + mSel.getValue();
    }
    wrap.getValue = get;
    wrap.setValue = (v) => {
      let [hh, mm] = v.split(":").map(Number);
      aSel.setValue(hh >= 12 ? "PM" : "AM");
      hSel.setValue(String(hh % 12 || 12));
      mSel.setValue(String(mm).padStart(2, "0"));
    };
    return wrap;
  }

  // ---- Date picker (custom calendar) ----
  function date({ value, onChange }) {
    let sel = value ? new Date(value) : null;
    let view = sel ? new Date(sel) : new Date();

    const wrap = document.createElement("div");
    wrap.className = "dp";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "dp-trigger";
    const lbl = document.createElement("span");
    const ico = document.createElement("span");
    ico.className = "cal-ico";
    ico.textContent = "📅";
    trigger.append(lbl, ico);

    const cal = document.createElement("div");
    cal.className = "cal";
    cal.hidden = true;
    cal.addEventListener("click", (e) => e.stopPropagation());

    const fmt = (d) =>
      d ? d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Pick a date";

    function render() {
      lbl.textContent = fmt(sel);
      cal.innerHTML = "";
      const head = document.createElement("div");
      head.className = "cal-head";
      const title = document.createElement("div");
      title.className = "cal-title";
      title.textContent = view.toLocaleDateString([], { month: "long", year: "numeric" });
      const nav = document.createElement("div");
      nav.className = "cal-nav";
      const prev = document.createElement("button");
      prev.type = "button";
      prev.textContent = "‹";
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "›";
      prev.addEventListener("click", () => {
        view.setMonth(view.getMonth() - 1);
        render();
      });
      next.addEventListener("click", () => {
        view.setMonth(view.getMonth() + 1);
        render();
      });
      nav.append(prev, next);
      head.append(title, nav);
      cal.append(head);

      const grid = document.createElement("div");
      grid.className = "cal-grid";
      for (const d of ["S", "M", "T", "W", "T", "F", "S"]) {
        const c = document.createElement("div");
        c.className = "cal-dow";
        c.textContent = d;
        grid.append(c);
      }
      const y = view.getFullYear();
      const m = view.getMonth();
      const startDow = new Date(y, m, 1).getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const prevDays = new Date(y, m, 0).getDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = startDow - 1; i >= 0; i--) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "cal-day dim";
        b.textContent = prevDays - i;
        b.disabled = true;
        grid.append(b);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "cal-day";
        b.textContent = day;
        const dDate = new Date(y, m, day);
        if (dDate.getTime() === today.getTime()) b.classList.add("today");
        if (sel && dDate.toDateString() === sel.toDateString()) b.classList.add("sel");
        b.addEventListener("click", () => {
          sel = dDate;
          cal.hidden = true;
          wrap.classList.remove("open");
          render();
          onChange && onChange(sel);
        });
        grid.append(b);
      }
      cal.append(grid);
    }

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = cal.hidden;
      closeAllMenus();
      if (willOpen) {
        cal.hidden = false;
        wrap.classList.add("open");
        liftCard(wrap);
        render();
      }
    });

    wrap.append(trigger, cal);
    render();
    wrap.getValue = () => sel;
    wrap.setValue = (v) => {
      sel = v ? new Date(v) : null;
      if (sel) view = new Date(sel);
      render();
    };
    return wrap;
  }

  // ---- Number stepper ----
  function number({ value, min = 0, max = 999, step = 1, onChange }) {
    let v = value;
    const wrap = document.createElement("div");
    wrap.className = "num";
    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    const val = document.createElement("span");
    val.className = "num-val";
    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    function set(n) {
      v = Math.min(max, Math.max(min, n));
      val.textContent = v;
      onChange && onChange(v);
    }
    minus.addEventListener("click", () => set(v - step));
    plus.addEventListener("click", () => set(v + step));
    wrap.append(minus, val, plus);
    val.textContent = v;
    wrap.getValue = () => v;
    wrap.setValue = (n) => {
      v = n;
      val.textContent = v;
    };
    return wrap;
  }

  window.UI = { select, time, date, number, closeAllMenus };
})();
