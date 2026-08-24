import { DB } from "./db.js";
import { DEFAULT_SCHEDULE_TYPES, newProfile } from "./models.js";
import { mountDutyTab } from "./dutyEntries.js";
import { mountLocomotivesTab } from "./locomotives.js";
import { mountSettingsTab } from "./settings.js";
import { attemptOpportunisticBackup } from "./drive.js";

const viewContainer = document.getElementById("view-container");
const headerTitle = document.getElementById("header-title");
const tabButtons = document.querySelectorAll(".tab-btn");

const TABS = {
  duty: { mount: mountDutyTab },
  locomotives: { mount: mountLocomotivesTab },
  settings: { mount: mountSettingsTab },
};

let activeTab = "duty";

function setHeaderTitle(text) {
  headerTitle.textContent = text;
}

async function switchTab(tabKey) {
  activeTab = tabKey;
  tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabKey));
  await TABS[tabKey].mount(viewContainer, setHeaderTitle);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

async function seedDefaultsIfNeeded() {
  const existingTypes = await DB.getAll("scheduleTypes");
  if (existingTypes.length === 0) {
    for (let i = 0; i < DEFAULT_SCHEDULE_TYPES.length; i++) {
      await DB.put("scheduleTypes", { code: DEFAULT_SCHEDULE_TYPES[i], displayOrder: i, isUserAdded: false });
    }
  }
  const profile = await DB.get("profile", "singleton");
  if (!profile) {
    await DB.put("profile", newProfile());
  }
  return profile;
}

async function maybeShowOnboarding() {
  const profile = await DB.get("profile", "singleton");
  if (profile && profile.name) return;
  const overlay = document.getElementById("onboarding-overlay");
  const input = document.getElementById("onboarding-name-input");
  const saveBtn = document.getElementById("onboarding-save-btn");
  overlay.classList.remove("hidden");
  await new Promise((resolve) => {
    saveBtn.onclick = async () => {
      const name = input.value.trim();
      if (!name) return;
      await DB.put("profile", { id: "singleton", name });
      overlay.classList.add("hidden");
      resolve();
    };
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.error("SW registration failed", err));
  }
}

function wireOpportunisticBackup() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      attemptOpportunisticBackup();
    }
  });
}

async function init() {
  await seedDefaultsIfNeeded();
  await maybeShowOnboarding();
  registerServiceWorker();
  wireOpportunisticBackup();
  await switchTab("duty");
  attemptOpportunisticBackup();
}

init();
