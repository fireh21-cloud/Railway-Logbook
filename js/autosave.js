// Generic debounce + flush autosave controller.
// Every field edit calls fieldChanged(); a save fires ~400ms after the last edit.
// flush() saves immediately (uncancelled) and is wired to page-hide/visibility-change
// events so an in-progress edit is never lost even if the debounce hasn't fired yet.

const DEBOUNCE_MS = 400;

export class AutosaveController {
  constructor(saveFn) {
    this.saveFn = saveFn; // async () => void
    this._timer = null;
    this._pendingSave = null;
  }

  fieldChanged() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._timer = null;
      this._runSave();
    }, DEBOUNCE_MS);
  }

  async flush() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    await this._runSave();
  }

  async _runSave() {
    // Coalesce overlapping saves so a flush during a pending save just awaits it.
    if (this._pendingSave) {
      await this._pendingSave;
    }
    this._pendingSave = Promise.resolve(this.saveFn()).catch((err) => {
      console.error("autosave failed", err);
    });
    await this._pendingSave;
    this._pendingSave = null;
  }
}

// Registers page lifecycle flush hooks for a controller. iOS Safari fires
// 'pagehide' and 'visibilitychange' (to hidden) reliably when the user
// switches away or closes the tab/app — the web equivalent of app backgrounding.
export function wireLifecycleFlush(controller) {
  const flush = () => controller.flush();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
  return () => {
    document.removeEventListener("visibilitychange", flush);
    window.removeEventListener("pagehide", flush);
  };
}
