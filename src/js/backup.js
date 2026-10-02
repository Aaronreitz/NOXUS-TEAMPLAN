import { serializeState } from "./state.js";

// Writes the daily backup file (see electron/main.js) shortly after changes,
// batched so typing doesn't hit the disk on every keystroke.
const DELAY_MS = 30_000;
let timer = null;

export function backupNow() {
  clearTimeout(timer);
  timer = null;
  // Not available when index.html is opened outside Electron.
  window.noxusBackup?.save(serializeState()).catch(() => {});
}

export function scheduleBackup() {
  timer ??= setTimeout(backupNow, DELAY_MS);
}

// Don't lose a pending backup when the window is closed.
window.addEventListener("beforeunload", () => {
  if (timer) backupNow();
});
