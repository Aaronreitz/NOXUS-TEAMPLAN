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
  dom.addColBtn.addEventListener("click", () => {
    appState.columns.push({ id: nextColumnId(), title: "Neu" });
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

  dom.planTable.addEventListener("focusout", (e) => {
    const t = e.target;

    const codeKey = t.getAttribute?.("data-code");
    if (codeKey) {
      const [dk, colId] = codeKey.split("|");
      const cell = getOrCreateCell(dk, colId);
      cell.code = t.value.trim();
      cleanupCell(dk, colId);
      saveState();
      renderPlanTable(dom);
      return;
    }

    const hoursKey = t.getAttribute?.("data-hours");
    if (hoursKey) {
      const [dk, colId] = hoursKey.split("|");
      const cell = getOrCreateCell(dk, colId);
      const raw = t.value.trim().replace(",", ".");
      const num = raw === "" ? "" : Number(raw);
      cell.hours = Number.isNaN(num) ? "" : num;
      cleanupCell(dk, colId);
      saveState();
      renderPlanTable(dom);
    }
  });
}
