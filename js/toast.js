let hideTimer = null;

export function showToast(message, durationMs = 2200) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => toast.classList.add("hidden"), durationMs);
}
