import { DB } from "./db.js";
import { el, formatRelative } from "./util.js";
import { AutosaveController } from "./autosave.js";
import { renderScheduleTypeManager } from "./scheduleTypes.js";
import * as Drive from "./drive.js";
import { showToast } from "./toast.js";

export async function mountSettingsTab(container, setHeaderTitle) {
  setHeaderTitle("Settings");
  container.innerHTML = "";

  const profile = (await DB.get("profile", "singleton")) || { id: "singleton", name: "" };
  const profileAutosave = new AutosaveController(async () => { await DB.put("profile", profile); });

  const profileSection = el("div", { class: "form-section" });
  profileSection.appendChild(el("div", { class: "form-section-title" }, "Profile"));
  profileSection.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "Pilot Name"),
    el("input", { type: "text", value: profile.name || "", oninput: (e) => { profile.name = e.target.value; profileAutosave.fieldChanged(); } }),
  ]));
  container.appendChild(profileSection);

  const scheduleLink = el("div", { class: "card list-row", onclick: () => openScheduleManager(container, setHeaderTitle) }, [
    el("div", { class: "list-row-main" }, [el("div", { class: "list-row-title" }, "Manage Schedule Types")]),
    el("span", {}, "›"),
  ]);
  container.appendChild(scheduleLink);

  // --- Backup section ---
  const backupSection = el("div", { class: "form-section" });
  backupSection.appendChild(el("div", { class: "form-section-title" }, "Google Drive Backup"));

  const clientIdRow = await DB.get("meta", "googleClientId");
  const clientIdInput = el("input", { type: "text", placeholder: "Google OAuth Web Client ID", value: (clientIdRow && clientIdRow.value) || "" });
  backupSection.appendChild(el("div", { class: "form-row" }, [
    el("label", {}, "OAuth Client ID (see README for setup)"),
    clientIdInput,
  ]));
  clientIdInput.onchange = async () => { await Drive.setClientId(clientIdInput.value.trim()); };

  const statusRow = el("div", { class: "form-row" });
  const lastBackupRow = el("div", { class: "form-row" });
  backupSection.appendChild(statusRow);
  backupSection.appendChild(lastBackupRow);

  async function refreshStatus() {
    statusRow.innerHTML = "";
    lastBackupRow.innerHTML = "";
    const signedIn = Drive.isSignedIn();
    statusRow.appendChild(el("label", {}, signedIn ? "Connected to Google Drive" : "Not connected"));
    const last = await Drive.getLastBackupAt();
    lastBackupRow.appendChild(el("label", {}, `Last successful backup: ${formatRelative(last)}`));
  }
  await refreshStatus();

  const connectBtn = el("button", { class: "secondary-btn", onclick: async () => {
    try {
      await Drive.setClientId(clientIdInput.value.trim());
      await Drive.signIn();
      showToast("Connected to Google Drive");
      await refreshStatus();
    } catch (e) {
      showToast(e.message || "Sign-in failed");
    }
  } }, "Connect Google Drive");

  const backupNowBtn = el("button", { class: "primary-btn", style: "margin-top:8px;", onclick: async () => {
    backupNowBtn.textContent = "Backing up…";
    try {
      await Drive.performBackup();
      showToast("Backup complete");
    } catch (e) {
      showToast(e.message || "Backup failed");
    } finally {
      backupNowBtn.textContent = "Backup Now";
      await refreshStatus();
    }
  } }, "Backup Now");

  const disconnectBtn = el("button", { class: "secondary-btn", style: "margin-top:8px;", onclick: async () => {
    Drive.signOut();
    await refreshStatus();
  } }, "Disconnect");

  backupSection.appendChild(el("div", { class: "form-row" }, [connectBtn, backupNowBtn, disconnectBtn]));
  container.appendChild(backupSection);

  const restoreLink = el("div", { class: "card list-row", onclick: () => openRestoreView(container, setHeaderTitle) }, [
    el("div", { class: "list-row-main" }, [el("div", { class: "list-row-title" }, "Restore from Backup")]),
    el("span", {}, "›"),
  ]);
  container.appendChild(restoreLink);
}

function openScheduleManager(container, setHeaderTitle) {
  const overlay = el("div", { class: "overlay" });
  const card = el("div", { class: "overlay-card" });
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  renderScheduleTypeManager(card);
  card.insertBefore(el("button", { class: "secondary-btn", onclick: () => { overlay.remove(); mountSettingsTab(container, setHeaderTitle); } }, "Close"), card.firstChild);
}

async function openRestoreView(container, setHeaderTitle) {
  const overlay = el("div", { class: "overlay" });
  const card = el("div", { class: "overlay-card" }, [el("h2", {}, "Restore from Backup")]);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  card.appendChild(el("p", {}, "Loading backups…"));
  try {
    const files = await Drive.listBackupFiles();
    card.querySelector("p").remove();
    if (files.length === 0) {
      card.appendChild(el("p", {}, "No backups found."));
    }
    for (const file of files) {
      card.appendChild(el("div", { class: "card list-row", onclick: async () => {
        if (!confirm(`Restore from ${file.name}? This replaces all current data on this device.`)) return;
        await Drive.restoreFromFile(file.id);
        showToast("Restore complete");
        overlay.remove();
        mountSettingsTab(container, setHeaderTitle);
      } }, [el("div", { class: "list-row-main" }, [el("div", { class: "list-row-title" }, file.name)])]));
    }
  } catch (e) {
    card.querySelector("p").textContent = e.message || "Failed to load backups.";
  }
  card.appendChild(el("button", { class: "secondary-btn", style: "margin-top:8px;", onclick: () => overlay.remove() }, "Close"));
}
