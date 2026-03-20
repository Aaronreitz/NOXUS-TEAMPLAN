import { wireEvents } from "./events.js";
import { renderPlanTable } from "./tableRender.js";

document.addEventListener("DOMContentLoaded", () => {
  const dom = {
    monthTitle: document.getElementById("monthTitle"),
    prevMonth: document.getElementById("prevMonth"),
    nextMonth: document.getElementById("nextMonth"),
    addColBtn: document.getElementById("addColBtn"),
    exportExcelBtn: document.getElementById("exportExcelBtn"),
    planTable: document.getElementById("planTable"),
  };

  wireEvents(dom);
  renderPlanTable(dom);
});
