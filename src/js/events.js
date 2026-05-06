import {
  appState,
  nextColumnId,
  getOrCreateCell,
  cleanupCell,
  saveState,
} from "./state.js";
import { renderPlanTable } from "./tableRender.js";
import { exportToExcel } from "./exportExcel.js";

export function wireEvents(dom) {
  let _pendingFocus = null; // { attr: "data-code"|"data-hours", key: string }

  dom.planTable.addEventListener("mousedown", (e) => {
    const input = e.target.tagName === "INPUT"
      ? e.target
      : e.target.closest("td")?.querySelector("input[data-code]") ?? e.target.closest("td")?.querySelector("input");
    if (!input) { _pendingFocus = null; return; }
    const codeKey    = input.getAttribute("data-code");
    const hoursKey   = input.getAttribute("data-hours");
    const sollKey    = input.getAttribute("data-soll");
    const commentKey = input.getAttribute("data-comment");
    _pendingFocus = codeKey
      ? { attr: "data-code",    key: codeKey }
      : hoursKey
        ? { attr: "data-hours",  key: hoursKey }
        : sollKey
          ? { attr: "data-soll", key: sollKey }
          : commentKey
            ? { attr: "data-comment", key: commentKey }
            : null;
  });
  dom.addColBtn.addEventListener("click", () => {
    appState.columns.push({ id: nextColumnId(), title: "Neu", soll: "" });
    saveState();
    renderPlanTable(dom);
  });

  dom.prevMonth.addEventListener("click", () => {
    appState.month0--;
    if (appState.month0 < 0) {
      appState.month0 = 11;
      appState.year--;
    }
    saveState();
    renderPlanTable(dom);
  });

  dom.nextMonth.addEventListener("click", () => {
    appState.month0++;
    if (appState.month0 > 11) {
      appState.month0 = 0;
      appState.year++;
    }
    saveState();
    renderPlanTable(dom);
  });

  dom.planTable.addEventListener("input", (e) => {
    const t = e.target;
    const colId = t.getAttribute?.("data-coltitle");
    if (!colId) return;
    const col = appState.columns.find((c) => c.id === colId);
    if (col) {
      col.title = t.value;
      saveState();
    }
  });

  dom.planTable.addEventListener("click", (e) => {
    if (e.target.tagName === "INPUT") return;
    const td = e.target.closest("td");
    if (td) {
      const input = td.querySelector("input[data-code]") ?? td.querySelector("input");
      input?.focus();
    }

    const btn = e.target.closest?.("[data-coldelete]");
    if (!btn) return;
    const colId = btn.getAttribute("data-coldelete");
    appState.columns = appState.columns.filter((c) => c.id !== colId);

    for (const dk of Object.keys(appState.cells)) {
      delete appState.cells[dk]?.[colId];
      if (appState.cells[dk] && Object.keys(appState.cells[dk]).length === 0) {
        delete appState.cells[dk];
      }
    }

    saveState();
    renderPlanTable(dom);
  });

  dom.exportExcelBtn.addEventListener("click", exportToExcel);

  // TODO: Tab-Navigation — _pendingFocus wird nur per mousedown gesetzt, nicht per Tab.
  // Nach einer Eingabe + Tab re-rendert die Tabelle und der Fokus geht verloren.
  // Fix: keydown auf Tab abfangen, nächstes Input-Element per DOM-Reihenfolge ermitteln
  // und als _pendingFocus setzen bevor focusout feuert.
  dom.planTable.addEventListener("focusout", (e) => {
    const t = e.target;
    function refocusAfterRender() {
      if (_pendingFocus) {
        const next = dom.planTable.querySelector(`[${_pendingFocus.attr}="${_pendingFocus.key}"]`);
        next?.focus();
        _pendingFocus = null;
      }
    }

    const codeKey = t.getAttribute?.("data-code");
    if (codeKey) {
      const [dk, colId] = codeKey.split("|");
      const newCode = t.value.trim();
      if (newCode === (appState.cells?.[dk]?.[colId]?.code ?? "")) return;
      const cell = getOrCreateCell(dk, colId);
      cell.code = newCode;
      cleanupCell(dk, colId);
      saveState();
      renderPlanTable(dom);
      refocusAfterRender();
      return;
    }

    const hoursKey = t.getAttribute?.("data-hours");
    if (hoursKey) {
      const [dk, colId] = hoursKey.split("|");
      const raw = t.value.trim().replace(",", ".");
      const num = raw === "" ? "" : Number(raw);
      const newHours = Number.isNaN(num) ? "" : num;
      if (newHours === (appState.cells?.[dk]?.[colId]?.hours ?? "")) return;
      const cell = getOrCreateCell(dk, colId);
      cell.hours = newHours;
      cleanupCell(dk, colId);
      saveState();
      renderPlanTable(dom);
      refocusAfterRender();
      return;
    }

    const sollKey = t.getAttribute?.("data-soll");
    if (sollKey) {
      const col = appState.columns.find((c) => c.id === sollKey);
      if (!col) return;
      const raw = t.value.trim().replace(",", ".");
      const num = raw === "" ? "" : Number(raw);
      const newSoll = Number.isNaN(num) ? "" : num;
      if (newSoll === (col.soll ?? "")) return;
      col.soll = newSoll;
      saveState();
      return;
    }

    const commentKey = t.getAttribute?.("data-comment");
    if (commentKey) {
      const newVal = t.value;
      if (newVal === (appState.comments[commentKey] ?? "")) return;
      if (newVal === "") delete appState.comments[commentKey];
      else appState.comments[commentKey] = newVal;
      saveState();
    }
  });
}
