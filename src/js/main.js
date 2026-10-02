import { wireEvents } from "./events.js";
import { renderPlanTable } from "./tableRender.js";
import { backupNow } from "./backup.js";

document.addEventListener("DOMContentLoaded", () => {
  const dom = {
    monthTitle: document.getElementById("monthTitle"),
    prevMonth: document.getElementById("prevMonth"),
    nextMonth: document.getElementById("nextMonth"),
    addColBtn: document.getElementById("addColBtn"),
    exportExcelBtn: document.getElementById("exportExcelBtn"),
    backupBtn: document.getElementById("backupBtn"),
    restoreBtn: document.getElementById("restoreBtn"),
    restoreInput: document.getElementById("restoreInput"),
    planTable: document.getElementById("planTable"),
  };

  wireEvents(dom);
  renderPlanTable(dom);
  backupNow(); // today's backup exists even if nothing gets edited
});
