import { DB } from "./db.js";
import { el } from "./util.js";

export async function renderScheduleTypeManager(container) {
  container.innerHTML = "";
  const header = el("div", { class: "sheet-header" }, [el("h2", {}, "Schedule Types")]);
  container.appendChild(header);

  const listWrap = el("div", { class: "form-section" });
  container.appendChild(listWrap);

  async function refresh() {
    listWrap.innerHTML = "";
    const types = (await DB.getAll("scheduleTypes")).sort((a, b) => a.displayOrder - b.displayOrder);
    if (types.length === 0) {
      listWrap.appendChild(el("div", { class: "form-row" }, "No schedule types yet."));
    }
    for (const t of types) {
      listWrap.appendChild(el("div", { class: "form-row", style: "flex-direction:row;align-items:center;justify-content:space-between;" }, [
        el("span", {}, t.code),
        el("button", { class: "icon-btn", onclick: async () => {
          await DB.delete("scheduleTypes", t.code);
          refresh();
        } }, "🗑"),
      ]));
    }
  }
  await refresh();

  const newCodeInput = el("input", { type: "text", placeholder: "e.g. AOH" });
  const addBtn = el("button", { class: "secondary-btn", onclick: async () => {
    const code = newCodeInput.value.trim().toUpperCase();
    if (!code) return;
    const existing = await DB.getAll("scheduleTypes");
    if (existing.some((t) => t.code === code)) { newCodeInput.value = ""; return; }
    const displayOrder = existing.length ? Math.max(...existing.map((t) => t.displayOrder)) + 1 : 0;
    await DB.put("scheduleTypes", { code, displayOrder, isUserAdded: true });
    newCodeInput.value = "";
    refresh();
  } }, "Add");

  container.appendChild(el("div", { class: "form-section" }, [
    el("div", { class: "form-row" }, [el("label", {}, "New schedule type code"), newCodeInput]),
    el("div", { class: "form-row" }, addBtn),
  ]));
}
