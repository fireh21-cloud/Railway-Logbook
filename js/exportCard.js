import { DB } from "./db.js";
import { kmFieldLabel } from "./models.js";
import { UICStatus } from "./models.js";
import { el, formatDate } from "./util.js";

const SCALE = 3; // render at 3x for a crisp shareable image
const CARD_WIDTH = 360;

const COLORS = {
  headerBg: "#7b1e14",
  headerText: "#faf0e1",
  cardBg: "#ffffff",
  label: "#7a6f63",
  value: "#241a15",
  divider: "#e0d8ca",
};

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildFields(entry, locomotives, profile) {
  const loco = locomotives.find((l) => l.id === entry.locomotiveId);
  const locoNumber = (loco && loco.number) || entry.locomotiveNumberSnapshot || "—";

  let uicValue = entry.uicStatus || "—";
  if (entry.uicStatus === UICStatus.MODIFIED && entry.uicCableOption) {
    uicValue += ` (${entry.uicCableOption})`;
  }

  return [
    { label: "Date", value: formatDate(entry.date) || "—" },
    { label: "Train", value: `${entry.trainNumber || "—"}${entry.trainName ? " — " + entry.trainName : ""}` },
    { label: "Locomotive", value: locoNumber },
    { label: "AC", value: entry.acStatus || "—" },
    { label: "UIC", value: uicValue },
    { label: "RTIS", value: entry.rtisStatus || "—" },
    { label: "Major Schedule", value: `${entry.majorScheduleTypeCode || "—"}${entry.majorScheduleDate ? " — " + formatDate(entry.majorScheduleDate) : ""}` },
    { label: "Minor Schedule / TI", value: entry.minorScheduleTIDate ? formatDate(entry.minorScheduleTIDate) : "Not available" },
    { label: kmFieldLabel(entry), value: entry.kmSinceLastSchedule != null ? String(entry.kmSinceLastSchedule) : "—" },
    { label: "Pilot", value: (profile && profile.name) || "—" },
  ];
}

function drawCard(canvas, fields) {
  const rowPadding = 12;
  const labelSize = 12;
  const valueSize = 16;
  const headerHeight = 64;
  const ctx = canvas.getContext("2d");

  // First pass (unscaled) to measure row heights with wrapping.
  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  mctx.font = `600 ${valueSize}px -apple-system, sans-serif`;
  const innerWidth = CARD_WIDTH - 32;
  const rowHeights = fields.map((f) => {
    const lines = wrapText(mctx, f.value, innerWidth);
    return rowPadding * 2 + labelSize + 6 + lines.length * (valueSize + 4);
  });
  const bodyHeight = rowHeights.reduce((a, b) => a + b, 0);
  const totalHeight = headerHeight + bodyHeight + 24;

  canvas.width = CARD_WIDTH * SCALE;
  canvas.height = totalHeight * SCALE;
  canvas.style.width = CARD_WIDTH + "px";
  canvas.style.height = totalHeight + "px";
  ctx.scale(SCALE, SCALE);

  // Card background
  ctx.fillStyle = COLORS.cardBg;
  roundRect(ctx, 0, 0, CARD_WIDTH, totalHeight, 12);
  ctx.fill();

  // Header
  ctx.save();
  roundRect(ctx, 0, 0, CARD_WIDTH, totalHeight, 12);
  ctx.clip();
  ctx.fillStyle = COLORS.headerBg;
  ctx.fillRect(0, 0, CARD_WIDTH, headerHeight);
  ctx.restore();

  ctx.fillStyle = COLORS.headerText;
  ctx.font = "700 20px -apple-system, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Duty Card", 16, 38);
  ctx.font = "400 13px -apple-system, sans-serif";
  ctx.fillText("RailwayLogbook", 16, 56);

  // Rows
  let y = headerHeight + 10;
  ctx.font = `600 ${valueSize}px -apple-system, sans-serif`;
  fields.forEach((f, i) => {
    const rowH = rowHeights[i];
    ctx.strokeStyle = COLORS.divider;
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(CARD_WIDTH - 16, y);
      ctx.stroke();
    }
    let textY = y + rowPadding + labelSize;
    ctx.fillStyle = COLORS.label;
    ctx.font = `500 ${labelSize}px -apple-system, sans-serif`;
    ctx.fillText(f.label.toUpperCase(), 16, textY);

    ctx.fillStyle = COLORS.value;
    ctx.font = `600 ${valueSize}px -apple-system, sans-serif`;
    const lines = wrapText(ctx, f.value, innerWidth);
    lines.forEach((line, li) => {
      ctx.fillText(line, 16, textY + 6 + (li + 1) * (valueSize + 4));
    });
    y += rowH;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function openExportCard(entry, locomotives) {
  const profile = await DB.get("profile", "singleton");
  const fields = buildFields(entry, locomotives, profile);

  const overlay = el("div", { class: "overlay" });
  const canvasWrap = el("div", { class: "duty-card-canvas-wrap" });
  const canvas = el("canvas");
  canvasWrap.appendChild(canvas);
  drawCard(canvas, fields);

  const shareBtn = el("button", { class: "primary-btn", onclick: async () => {
    canvas.toBlob(async (blob) => {
      const filename = `duty-card-${entry.date || "entry"}.png`;
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "image/png" })] })) {
        try {
          await navigator.share({ files: [new File([blob], filename, { type: "image/png" })], title: "Duty Card" });
          return;
        } catch (e) {
          // user cancelled or share failed — fall through to download
        }
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
    el("h2", {}, "Duty Card"),
    canvasWrap,
    shareBtn,
    closeBtn,
  ]);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
