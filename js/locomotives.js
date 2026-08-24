import { DB } from "./db.js";
import { newLocomotive } from "./models.js";
import { el } from "./util.js";
import { AutosaveController } from "./autosave.js";

export async function mountLocomotivesTab(container, setHeaderTitle) {
  await showList(container, setHeaderTitle);
}

async function showList(container, setHeaderTitle) {
  setHeaderTitle("Locomotives");
  container.innerHTML = "";

  const locomotives = await DB.getAll("locomotives");
  locomotives.sort((a, b) => (a.number || "").localeCompare(b.number || ""));

  const listWrap = el("div", {});
  container.appendChild(listWrap);

  if (locomotives.length === 0) {
    listWrap.appendChild(el("div", { class: "empty-state" }, "No locomotives yet. Tap + to add one."));
  } else {
    for (const loco of locomotives) {
      const dutyCount = await DB.getAll("dutyEntries").then((all) => all.filter((e) => e.locomotiveId === loco.id).length);
      const row = el("div", { class: "card list-row", onclick: () => showForm(container, setHeaderTitle, loco.id) }, [
        el("div", { class: "list-row-main" }, [
          el("div", { class: "list-row-title" }, loco.number || "—"),
          el("div", { class: "list-row-sub" }, `${loco.locoClass || "—"} · ${loco.shed || "—"}${dutyCount ? ` · ${dutyCount} duty entries` : ""}`),
        ]),
      ]);
      listWrap.appendChild(row);
    }
  }

  const fab = el("button", { class: "fab", onclick: async () => {
    const loco = newLocomotive();
    await DB.put("locomotives", loco);
    showForm(container, setHeaderTitle, loco.id);
  } }, "+");
  container.appendChild(fab);
}

async function showForm(container, setHeaderTitle, locoId) {
  setHeaderTitle("Locomotive");
  container.innerHTML = "";

  const loco = await DB.get("locomotives", locoId);
  const autosave = new AutosaveController(async () => {
    await DB.put("locomotives", loco);
  });

  async function goBack() {
    await autosave.flush();
    if (!loco.number && !loco.locoClass && !loco.shed) {
      await DB.delete("locomotives", loco.id);
    }
    showList(container, setHeaderTitle);
  }

  const header = el("div", { class: "sheet-header" }, [
    el("button", { class: "icon-btn", onclick: goBack }, "← Back"),
    el("button", { class: "icon-btn", onclick: async () => {
      const dutyCount = await DB.getAll("dutyEntries").then((all) => all.filter((e) => e.locomotiveId === loco.id).length);
      const msg = dutyCount
        ? `This locomotive has ${dutyCount} duty entries. They'll keep their locomotive number on record, but stop linking to this master-list entry. Delete anyway?`
        : "Delete this locomotive?";
      if (confirm(msg)) {
        await DB.delete("locomotives", loco.id);
        showList(container, setHeaderTitle);
      }
    } }, "🗑"),
  ]);
  container.appendChild(header);

  const section = el("div", { class: "form-section" });
  section.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "Number"),
    el("input", { type: "text", value: loco.number || "", oninput: (e) => { loco.number = e.target.value; autosave.fieldChanged(); } }),
  ]));
  section.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "Class (e.g. WAP-4)"),
    el("input", { type: "text", value: loco.locoClass || "", oninput: (e) => { loco.locoClass = e.target.value; autosave.fieldChanged(); } }),
  ]));
  section.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "Shed"),
    el("input", { type: "text", value: loco.shed || "", oninput: (e) => { loco.shed = e.target.value; autosave.fieldChanged(); } }),
  ]));
  container.appendChild(section);
}
