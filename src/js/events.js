import {
  appState,
  nextColumnId,
  getOrCreateCell,
  cleanupCell,
  saveState,
  serializeState,
  replaceState,
  toggleManualCovered,
  parseNumber,
  setSoll,
} from "./state.js";
import { renderPlanTable } from "./tableRender.js";
import { exportToExcel } from "./exportExcel.js";
import { openCalendarModal, closeCalendarModal } from "./calendarModal.js";
import { recordUndo, undo, redo } from "./history.js";
import { dateKey } from "./dateUtils.js";

// data-* hooks that identify an interactive element across re-renders.
const FOCUS_KEYS = [
  "data-code", "data-hours", "data-soll", "data-coltitle", "data-comment",
  "data-calview", "data-coldelete", "data-togglecover",
];

function focusSelector(el) {
  for (const attr of FOCUS_KEYS) {
    const v = el?.getAttribute?.(attr);
    if (v) return `[${attr}="${CSS.escape(v)}"]`;
  }
  return null;
}

export function wireEvents(dom) {
  // Edits go into state (and localStorage) on every keystroke, so nothing is
  // lost if the app closes mid-edit. The table is only re-rendered on
  // focusout, because the innerHTML re-render destroys the focused input.
  let needsRender = false;
  // Cell input to focus when the user mouses down on a cell's empty area —
  // the re-render on focusout would otherwise swallow the following click.
  let pendingTarget = null;
  // Input that already has an undo snapshot for its current edit, so one
  // Ctrl+Z reverts the whole entry instead of a single keystroke.
  let recordedFor = null;

  function render() {
    renderPlanTable(dom);
    needsRender = false;
  }

  // Re-renders and hands back the fresh copy of `el` (matched by data-* key).
  function renderKeeping(el) {
    const sel = focusSelector(el);
    render();
    return sel ? dom.planTable.querySelector(sel) : null;
  }

  dom.planTable.addEventListener("mousedown", (e) => {
    pendingTarget = e.target.closest("input, button")
      ? null
      : e.target.closest("td")?.querySelector("input[data-code]") ??
        e.target.closest("td")?.querySelector("input") ??
        null;
  });

  dom.planTable.addEventListener("focusout", (e) => {
    // relatedTarget is where focus is going (Tab target or clicked input).
    const next = e.relatedTarget ?? pendingTarget;
    pendingTarget = null;
    recordedFor = null;
    if (!needsRender) return;
    // Window lost focus (Alt+Tab): keep the input alive, render on the next real focusout.
    if (!document.hasFocus()) return;
    // Table buttons re-render in their own click handler; doing it here would
    // replace the button between mousedown and click and swallow the click.
    if (next?.tagName === "BUTTON" && dom.planTable.contains(next)) return;

    const fresh = dom.planTable.contains(next) ? renderKeeping(next) : (render(), null);
    fresh?.focus();
    fresh?.select?.();
  });

  dom.planTable.addEventListener("input", (e) => {
    const t = e.target;
    // State still holds the pre-edit value here, so this snapshots the old state.
    if (recordedFor !== t) { recordUndo(); recordedFor = t; }

    const titleId = t.getAttribute("data-coltitle");
    if (titleId) {
      const col = appState.columns.find((c) => c.id === titleId);
      if (col) col.title = t.value;
    }

    const codeKey = t.getAttribute("data-code");
    if (codeKey) {
      const [dk, colId] = codeKey.split("|");
      getOrCreateCell(dk, colId).code = t.value.trim().toUpperCase();
      cleanupCell(dk, colId);
      needsRender = true;
    }

    const hoursKey = t.getAttribute("data-hours");
    if (hoursKey) {
      const [dk, colId] = hoursKey.split("|");
      getOrCreateCell(dk, colId).hours = parseNumber(t.value);
      cleanupCell(dk, colId);
      needsRender = true;
    }

    const sollId = t.getAttribute("data-soll");
    if (sollId) {
      setSoll(sollId, parseNumber(t.value));
      needsRender = true;
    }

    const commentKey = t.getAttribute("data-comment");
    if (commentKey) {
      if (t.value === "") delete appState.comments[commentKey];
      else appState.comments[commentKey] = t.value;
    }

    saveState();
  });

  dom.planTable.addEventListener("click", (e) => {
    pendingTarget = null;
    if (e.target.tagName === "INPUT") return;

    let btn = e.target.closest("button");
    // Focus moved straight from an edited input to this button, so the
    // pending re-render happens now (footer sums, X placeholders).
    if (btn && needsRender) btn = renderKeeping(btn);

    const calId = btn?.getAttribute("data-calview");
    if (calId) { openCalendarModal(calId); return; }

    const coverDk = btn?.getAttribute("data-togglecover");
    if (coverDk) {
      recordUndo();
      toggleManualCovered(coverDk);
      saveState();
      render();
      return;
    }

    const delId = btn?.getAttribute("data-coldelete");
    if (delId) {
      // Two-click confirm instead of confirm(): native dialogs in Electron on
      // Windows can leave text inputs unfocusable afterwards.
      if (!btn.classList.contains("armed")) {
        btn.classList.add("armed");
        btn.title = "Nochmal klicken: Person mit allen Einträgen in allen Monaten löschen";
        setTimeout(() => {
          btn.classList.remove("armed");
          btn.title = "Entfernen";
        }, 3000);
        return;
      }
      recordUndo();
      appState.columns = appState.columns.filter((c) => c.id !== delId);
      for (const dk of Object.keys(appState.cells)) {
        delete appState.cells[dk]?.[delId];
        if (appState.cells[dk] && Object.keys(appState.cells[dk]).length === 0) {
          delete appState.cells[dk];
        }
      }
      for (const mk of Object.keys(appState.soll)) {
        delete appState.soll[mk][delId];
        if (Object.keys(appState.soll[mk]).length === 0) delete appState.soll[mk];
      }
      saveState();
      render();
      return;
    }

    const td = e.target.closest("td");
    (td?.querySelector("input[data-code]") ?? td?.querySelector("input"))?.focus();
  });

  // Enter / ↓ moves to the same field on the next day, Shift+Enter / ↑ back —
  // a shift plan is mostly filled per person, top to bottom.
  dom.planTable.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const down = (e.key === "Enter" && !e.shiftKey) || e.key === "ArrowDown";
    const up = (e.key === "Enter" && e.shiftKey) || e.key === "ArrowUp";
    if (!down && !up) return;

    const attr = ["data-code", "data-hours", "data-comment"].find((a) => e.target.hasAttribute(a));
    if (!attr) return;
    e.preventDefault();

    const [dk, colId] = e.target.getAttribute(attr).split("|");
    const [y, m, d] = dk.split("-").map(Number);
    // Day 0 / 32 produce keys that don't exist, so navigation stops at month edges.
    const nextDk = dateKey(y, m - 1, d + (down ? 1 : -1));
    const next = dom.planTable.querySelector(`[${attr}="${colId ? `${nextDk}|${colId}` : nextDk}"]`);
    if (!next) return;
    next.focus(); // focusout may re-render and focus the fresh copy itself
    if (next.isConnected) next.select();
  });

  document.addEventListener("keydown", (e) => {
    if (!e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const isUndo = k === "z" && !e.shiftKey;
    const isRedo = k === "y" || (k === "z" && e.shiftKey);
    if (!isUndo && !isRedo) return;
    // Replaces the inputs' own undo: our snapshots already cover every edit.
    e.preventDefault();
    if (!(isUndo ? undo() : redo())) return;
    recordedFor = null;
    const active = document.activeElement;
    const fresh = dom.planTable.contains(active) ? renderKeeping(active) : (render(), null);
    fresh?.focus();
    fresh?.select?.();
  });

  dom.addColBtn.addEventListener("click", () => {
    recordUndo();
    appState.columns.push({ id: nextColumnId(), title: "Neu" });
    saveState();
    render();
  });

  dom.prevMonth.addEventListener("click", () => {
    appState.month0--;
    if (appState.month0 < 0) { appState.month0 = 11; appState.year--; }
    saveState();
    render();
  });

  dom.nextMonth.addEventListener("click", () => {
    appState.month0++;
    if (appState.month0 > 11) { appState.month0 = 0; appState.year++; }
    saveState();
    render();
  });

  dom.exportExcelBtn.addEventListener("click", exportToExcel);

  dom.backupBtn.addEventListener("click", () => {
    const blob = new Blob([serializeState()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Teamplan_Sicherung_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  dom.restoreBtn.addEventListener("click", () => dom.restoreInput.click());
  dom.restoreInput.addEventListener("change", async () => {
    const file = dom.restoreInput.files?.[0];
    dom.restoreInput.value = ""; // allow re-selecting the same file later
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      recordUndo();
      replaceState(data);
    } catch (err) {
      alert(`Sicherung konnte nicht geladen werden: ${err.message}`);
      return;
    }
    saveState();
    render();
  });

  document.getElementById("calModalClose").addEventListener("click", closeCalendarModal);
  document.getElementById("calModalPrint").addEventListener("click", () => window.print());
  document.getElementById("calendarModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeCalendarModal();
  });
}
