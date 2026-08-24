// Shared formatting helpers.

export function formatDate(isoDateStr) {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr + "T00:00:00");
  if (isNaN(d)) return isoDateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(isoTimeStr) {
  if (!isoTimeStr) return "--:--";
  const d = new Date(isoTimeStr);
  if (isNaN(d)) return "--:--";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatRelative(isoStr) {
  if (!isoStr) return "Never";
  const then = new Date(isoStr).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

// Combines today's date with a "HH:MM" time input value into an ISO timestamp string.
export function timeInputToISO(dateStr, timeValue) {
  if (!timeValue) return null;
  return `${dateStr}T${timeValue}:00`;
}

export function isoToTimeInputValue(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d)) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function nowTimeInputValue() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// A time-of-day field that starts as a "tap to set" button; on first tap it
// fills in the current time and becomes an editable time input with a clear (x).
// value: current ISO string or null. onChange(newISOStringOrNull) is called on every edit.
export function createTimeField(dateStr, value, onChange) {
  const wrap = el("div", { class: "time-row-controls" });

  function renderInput(currentValue) {
    wrap.innerHTML = "";
    if (!currentValue) {
      const setBtn = el("button", {
        class: "secondary-btn",
        type: "button",
        onclick: () => {
          const iso = timeInputToISO(dateStr, nowTimeInputValue());
          onChange(iso);
          renderInput(iso);
        },
      }, "Tap to set");
      wrap.appendChild(setBtn);
      return;
    }
    const input = el("input", {
      type: "time",
      value: isoToTimeInputValue(currentValue),
      onchange: (e) => onChange(timeInputToISO(dateStr, e.target.value)),
    });
    const clearBtn = el("button", {
      class: "time-clear-btn",
      type: "button",
      "aria-label": "Clear",
      onclick: () => {
        onChange(null);
        renderInput(null);
      },
    }, "×");
    wrap.appendChild(input);
    wrap.appendChild(clearBtn);
  }

  renderInput(value);
  return wrap;
}

export function createDropdown(options, value, onChange, attrs = {}) {
  const select = el("select", { ...attrs, onchange: (e) => onChange(e.target.value) });
  for (const opt of options) {
    const optEl = el("option", { value: opt }, opt);
    if (opt === value) optEl.selected = true;
    select.appendChild(optEl);
  }
  return select;
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}
