import { DB } from "./db.js";
import {
  newDutyEntry, kmFieldLabel, TIMELINE_STEPS,
  AC_STATUS_OPTIONS, UIC_STATUS_OPTIONS, UIC_CABLE_OPTIONS, RTIS_STATUS_OPTIONS,
  ACStatus, UICStatus, DEFAULT_SCHEDULE_TYPES,
} from "./models.js";
import { AutosaveController, wireLifecycleFlush } from "./autosave.js";
import { el, formatDate, formatTime, createTimeField, createDropdown, todayDateInputValue } from "./util.js";
import { openExportCard } from "./exportCard.js";
import { openRangeReport } from "./rangeReport.js";

let currentUnwireLifecycle = null;

function isEntryEmpty(entry) {
  if (entry.trainNumber || entry.trainName || entry.remarks) return false;
  if (entry.locomotiveId) return false;
  for (const step of TIMELINE_STEPS) {
    if (entry[step.key]) return false;
  }
  return true;
}

export async function mountDutyTab(container, setHeaderTitle) {
  await showList(container, setHeaderTitle);
}

async function showList(container, setHeaderTitle) {
  if (currentUnwireLifecycle) { currentUnwireLifecycle(); currentUnwireLifecycle = null; }
  setHeaderTitle("Duty Log");
  container.innerHTML = "";

  let allEntries = await DB.getAll("dutyEntries");
  allEntries.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.lastModified || "").localeCompare(a.lastModified || ""));

  const toolbar = el("div", { class: "toolbar-row" }, [
    el("button", { class: "secondary-btn", onclick: () => openRangeReport(allEntries) }, "Export range report"),
  ]);
  container.appendChild(toolbar);

  const filterCard = el("div", { class: "card" });
  const fromInput = el("input", { type: "date" });
  const toInput = el("input", { type: "date" });
  const searchInput = el("input", { type: "text", placeholder: "Search train no. / name / loco" });
  filterCard.appendChild(el("div", { class: "form-row" }, [el("label", {}, "From"), fromInput]));
  filterCard.appendChild(el("div", { class: "form-row" }, [el("label", {}, "To"), toInput]));
  filterCard.appendChild(el("div", { class: "form-row" }, [el("label", {}, "Search"), searchInput]));
  container.appendChild(filterCard);

  const listWrap = el("div", {});
  container.appendChild(listWrap);

  function applyFilterAndRender() {
    let filtered = allEntries;
    if (fromInput.value) filtered = filtered.filter((e) => e.date >= fromInput.value);
    if (toInput.value) filtered = filtered.filter((e) => e.date <= toInput.value);
    const q = searchInput.value.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((e) =>
        (e.trainNumber || "").toLowerCase().includes(q) ||
        (e.trainName || "").toLowerCase().includes(q) ||
        (e.locomotiveNumberSnapshot || "").toLowerCase().includes(q)
      );
    }
    renderRows(filtered);
  }

  function renderRows(entries) {
    listWrap.innerHTML = "";
    if (entries.length === 0) {
      listWrap.appendChild(el("div", { class: "empty-state" }, "No duty entries yet. Tap + to add one."));
      return;
    }
    for (const entry of entries) {
      const badges = [];
      if (entry.acStatus && entry.acStatus !== ACStatus.WORKING) badges.push(el("span", { class: "badge warn" }, "AC"));
      if (entry.uicStatus === UICStatus.MODIFIED) badges.push(el("span", { class: "badge" }, "UIC Modified"));
      const row = el("div", { class: "card list-row", onclick: () => showForm(container, setHeaderTitle, entry.id) }, [
        el("div", { class: "list-row-main" }, [
          el("div", { class: "list-row-title" }, `${entry.trainNumber || "—"} ${entry.trainName ? "· " + entry.trainName : ""}`),
          el("div", { class: "list-row-sub" }, `${formatDate(entry.date)} · Loco ${entry.locomotiveNumberSnapshot || "—"}`),
          badges.length ? el("div", { class: "list-row-badges" }, badges) : null,
        ]),
      ]);
      listWrap.appendChild(row);
    }
  }

  fromInput.onchange = applyFilterAndRender;
  toInput.onchange = applyFilterAndRender;
  searchInput.oninput = applyFilterAndRender;
  renderRows(allEntries);

  const fab = el("button", { class: "fab", onclick: async () => {
    const entry = newDutyEntry();
    await DB.put("dutyEntries", entry);
    showForm(container, setHeaderTitle, entry.id);
  } }, "+");
  container.appendChild(fab);
}

async function showForm(container, setHeaderTitle, entryId) {
  setHeaderTitle("Duty Entry");
  container.innerHTML = "";

  let entry = await DB.get("dutyEntries", entryId);
  const locomotives = await DB.getAll("locomotives");
  const scheduleTypes = await DB.getAll("scheduleTypes");
  const scheduleCodes = scheduleTypes.length ? scheduleTypes.sort((a, b) => a.displayOrder - b.displayOrder).map((s) => s.code) : DEFAULT_SCHEDULE_TYPES;

  const autosave = new AutosaveController(async () => {
    entry.lastModified = new Date().toISOString();
    await DB.put("dutyEntries", entry);
  });
  currentUnwireLifecycle = wireLifecycleFlush(autosave);

  async function goBack() {
    await autosave.flush();
    if (isEntryEmpty(entry)) {
      await DB.delete("dutyEntries", entry.id);
    }
    showList(container, setHeaderTitle);
  }

  function onFieldChange() {
    autosave.fieldChanged();
  }

  const header = el("div", { class: "sheet-header" }, [
    el("button", { class: "icon-btn", onclick: goBack }, "← Back"),
    el("div", {}, [
      el("button", { class: "icon-btn", onclick: () => openExportCard(entry, locomotives) }, "⇪"),
      el("button", { class: "icon-btn", onclick: async () => {
        if (confirm("Delete this duty entry?")) {
          await DB.delete("dutyEntries", entry.id);
          showList(container, setHeaderTitle);
        }
      } }, "🗑"),
    ]),
  ]);
  container.appendChild(header);

  // --- Trip Info ---
  const tripSection = el("div", { class: "form-section" });
  tripSection.appendChild(el("div", { class: "form-section-title" }, "Trip Info"));
  tripSection.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "Date"),
    el("input", { type: "date", value: entry.date || todayDateInputValue(), onchange: (e) => { entry.date = e.target.value; onFieldChange(); } }),
  ]));
  tripSection.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "Train Number"),
    el("input", { type: "text", value: entry.trainNumber || "", oninput: (e) => { entry.trainNumber = e.target.value; onFieldChange(); } }),
  ]));
  tripSection.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "Train Name"),
    el("input", { type: "text", value: entry.trainName || "", oninput: (e) => { entry.trainName = e.target.value; onFieldChange(); } }),
  ]));
  const locoOptions = [{ id: "", number: "— None —" }, ...locomotives];
  const locoSelect = el("select", { onchange: (e) => {
    entry.locomotiveId = e.target.value || null;
    const loco = locomotives.find((l) => l.id === e.target.value);
    entry.locomotiveNumberSnapshot = loco ? loco.number : "";
    onFieldChange();
  } });
  for (const loco of locoOptions) {
    const label = loco.id === "" ? loco.number : `${loco.number}${loco.locoClass ? " · " + loco.locoClass : ""}`;
    const opt = el("option", { value: loco.id }, label);
    if (loco.id === (entry.locomotiveId || "")) opt.selected = true;
    locoSelect.appendChild(opt);
  }
  tripSection.appendChild(el("div", { class: "form-row" }, [el("label", {}, "Locomotive"), locoSelect]));
  if (locomotives.length === 0) {
    tripSection.appendChild(el("div", { class: "form-row" }, el("span", { class: "list-row-sub" }, "No locomotives yet — add one from the Locomotives tab.")));
  }
  container.appendChild(tripSection);

  // --- Timeline of Working ---
  const timelineSection = el("div", { class: "form-section" });
  timelineSection.appendChild(el("div", { class: "form-section-title" }, "Timeline of Working"));
  for (const step of TIMELINE_STEPS) {
    const row = el("div", { class: "time-row" });
    row.appendChild(el("div", { class: "time-row-label" }, step.label));
    row.appendChild(createTimeField(entry.date, entry[step.key], (val) => { entry[step.key] = val; onFieldChange(); }));
    timelineSection.appendChild(row);
    if (step.key === "buildupTime") {
      timelineSection.appendChild(el("div", { class: "form-row" }, [
        el("label", {}, "Buildup Location"),
        el("input", { type: "text", value: entry.buildupLocation || "", oninput: (e) => { entry.buildupLocation = e.target.value; onFieldChange(); } }),
      ]));
    }
  }
  container.appendChild(timelineSection);

  // --- Status Checks ---
  const statusSection = el("div", { class: "form-section" });
  statusSection.appendChild(el("div", { class: "form-section-title" }, "Status Checks"));
  statusSection.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "AC"),
    createDropdown(AC_STATUS_OPTIONS, entry.acStatus, (v) => { entry.acStatus = v; onFieldChange(); }),
  ]));
  const uicRow = el("div", { class: "form-row" });
  uicRow.appendChild(el("label", {}, "UIC"));
  const uicCableRowHolder = el("div", {});
  function renderUicCableRow() {
    uicCableRowHolder.innerHTML = "";
    if (entry.uicStatus === UICStatus.MODIFIED) {
      uicCableRowHolder.appendChild(el("div", { class: "form-row" }, [
        el("label", {}, "Cable"),
        createDropdown(UIC_CABLE_OPTIONS, entry.uicCableOption || UIC_CABLE_OPTIONS[0], (v) => { entry.uicCableOption = v; onFieldChange(); }),
      ]));
      if (!entry.uicCableOption) { entry.uicCableOption = UIC_CABLE_OPTIONS[0]; onFieldChange(); }
    } else if (entry.uicCableOption) {
      entry.uicCableOption = null;
      onFieldChange();
    }
  }
  uicRow.appendChild(createDropdown(UIC_STATUS_OPTIONS, entry.uicStatus, (v) => { entry.uicStatus = v; onFieldChange(); renderUicCableRow(); }));
  statusSection.appendChild(uicRow);
  statusSection.appendChild(uicCableRowHolder);
  renderUicCableRow();
  statusSection.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "RTIS"),
    createDropdown(RTIS_STATUS_OPTIONS, entry.rtisStatus, (v) => { entry.rtisStatus = v; onFieldChange(); }),
  ]));
  container.appendChild(statusSection);

  // --- Schedule Info ---
  const schedSection = el("div", { class: "form-section" });
  schedSection.appendChild(el("div", { class: "form-section-title" }, "Schedule Info"));
  schedSection.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "Major Schedule Type"),
    createDropdown(scheduleCodes, entry.majorScheduleTypeCode, (v) => { entry.majorScheduleTypeCode = v; onFieldChange(); }),
  ]));
  schedSection.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "Major Schedule Date"),
    el("input", { type: "date", value: entry.majorScheduleDate || "", onchange: (e) => { entry.majorScheduleDate = e.target.value || null; onFieldChange(); } }),
  ]));
  schedSection.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "Minor Schedule / TI Date (optional)"),
    el("input", { type: "date", value: entry.minorScheduleTIDate || "", onchange: (e) => { entry.minorScheduleTIDate = e.target.value || null; onFieldChange(); kmLabel.textContent = kmFieldLabel(entry); } }),
  ]));
  const kmLabel = el("label", {}, kmFieldLabel(entry));
  schedSection.appendChild(el("div", { class: "form-row" }, [
    kmLabel,
    el("input", { type: "number", inputmode: "decimal", value: entry.kmSinceLastSchedule ?? "", oninput: (e) => { entry.kmSinceLastSchedule = e.target.value === "" ? null : Number(e.target.value); onFieldChange(); } }),
  ]));
  container.appendChild(schedSection);

  // --- Remarks ---
  const remarksSection = el("div", { class: "form-section" });
  remarksSection.appendChild(el("div", { class: "form-section-title" }, "Remarks"));
  remarksSection.appendChild(el("div", { class: "form-row" }, [
    el("textarea", { oninput: (e) => { entry.remarks = e.target.value; onFieldChange(); } }, entry.remarks || ""),
  ]));
  container.appendChild(remarksSection);
}
