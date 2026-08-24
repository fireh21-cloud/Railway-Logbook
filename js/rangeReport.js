import { el, formatDate } from "./util.js";

const SCALE = 3;
const WIDTH = 380;
const ROW_H = 28;
const HEADER_H = 50;
const COL_HEADER_H = 24;

function drawTable(canvas, entries) {
  const totalHeight = HEADER_H + COL_HEADER_H + entries.length * ROW_H + 16;
  const ctx = canvas.getContext("2d");
  canvas.width = WIDTH * SCALE;
  canvas.height = totalHeight * SCALE;
  canvas.style.width = WIDTH + "px";
  canvas.style.height = totalHeight + "px";
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, totalHeight);
  ctx.fillStyle = "#7b1e14";
  ctx.fillRect(0, 0, WIDTH, HEADER_H);
  ctx.fillStyle = "#faf0e1";
  ctx.font = "700 18px -apple-system, sans-serif";
  ctx.fillText("Duty Range Report", 14, 32);

  const cols = [
    { label: "Date", x: 14, w: 70 },
    { label: "Train", x: 84, w: 110 },
    { label: "Loco", x: 194, w: 90 },
    { label: "KM", x: 284, w: 82 },
  ];

  ctx.fillStyle = "#7a6f63";
  ctx.font = "600 12px -apple-system, sans-serif";
  let y = HEADER_H + 16;
  for (const c of cols) ctx.fillText(c.label.toUpperCase(), c.x, y);
  y += 8;
  ctx.strokeStyle = "#e0d8ca";
  ctx.beginPath();
  ctx.moveTo(14, y);
  ctx.lineTo(WIDTH - 14, y);
  ctx.stroke();

  ctx.font = "500 13px -apple-system, sans-serif";
  ctx.fillStyle = "#241a15";
  for (const entry of entries) {
    y += ROW_H;
    const row = [
      formatDate(entry.date),
      entry.trainNumber || "—",
      entry.locomotiveNumberSnapshot || "—",
      entry.kmSinceLastSchedule != null ? String(entry.kmSinceLastSchedule) : "—",
    ];
    row.forEach((text, i) => {
      ctx.fillText(String(text).slice(0, 16), cols[i].x, y);
    });
    ctx.strokeStyle = "#f1e8d8";
    ctx.beginPath();
    ctx.moveTo(14, y + 8);
    ctx.lineTo(WIDTH - 14, y + 8);
    ctx.stroke();
  }
}

export function openRangeReport(allEntries) {
  const overlay = el("div", { class: "overlay" });
  const fromInput = el("input", { type: "date" });
  const toInput = el("input", { type: "date" });
  const canvasWrap = el("div", { class: "duty-card-canvas-wrap" });
  const canvas = el("canvas");
  canvasWrap.appendChild(canvas);

  function render() {
    let filtered = allEntries.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    if (fromInput.value) filtered = filtered.filter((e) => e.date >= fromInput.value);
    if (toInput.value) filtered = filtered.filter((e) => e.date <= toInput.value);
    drawTable(canvas, filtered);
  }
  fromInput.onchange = render;
  toInput.onchange = render;
  render();

  const shareBtn = el("button", { class: "primary-btn", onclick: () => {
    canvas.toBlob(async (blob) => {
      const filename = `duty-range-report.png`;
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "image/png" })] })) {
        try {
          await navigator.share({ files: [new File([blob], filename, { type: "image/png" })], title: "Duty Range Report" });
          return;
        } catch (e) { /* fall through to download */ }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, "image/png");
  } }, "Share / Save Image");

  const closeBtn = el("button", { class: "secondary-btn", style: "margin-top:8px;", onclick: () => overlay.remove() }, "Close");

  const card = el("div", { class: "overlay-card" }, [
    el("h2", {}, "Range Report"),
    el("div", { class: "form-row" }, [el("label", {}, "From"), fromInput]),
    el("div", { class: "form-row" }, [el("label", {}, "To"), toInput]),
    canvasWrap,
    shareBtn,
    closeBtn,
  ]);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
