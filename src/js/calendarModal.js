import { appState, effectiveCode } from "./state.js";
import { daysInMonth, monthTitle, dateKey } from "./dateUtils.js";

function statusClass(code) {
  const c = String(code || "").trim().toUpperCase();
  if (c.startsWith("KR")) return "s-kr";
  if (c.startsWith("TD")) return "s-td";
  if (c.startsWith("N"))  return "s-n";
  if (c.startsWith("X"))  return "s-x";
  if (c.startsWith("U"))  return "s-u";
  return "";
}

export function openCalendarModal(colId) {
  const col = appState.columns.find((c) => c.id === colId);
  if (!col) return;

  const { year, month0 } = appState;
  const days = daysInMonth(year, month0);
  const startOffset = (new Date(year, month0, 1).getDay() + 6) % 7; // Mo=0…So=6
  const totalCells = Math.ceil((startOffset + days) / 7) * 7;
  const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  let cells = "";
  for (let i = 0; i < totalCells; i++) {
    const day = i - startOffset + 1;
    const colIdx = i % 7;
    const isWe = colIdx >= 5;
    if (day < 1 || day > days) {
      cells += `<div class="cal-cell off ${isWe ? "we" : ""}"></div>`;
      continue;
    }

    const dk = dateKey(year, month0, day);
    const storedCode = appState.cells?.[dk]?.[colId]?.code ?? "";
    const effCode    = effectiveCode(dk, colId);
    const display    = storedCode || effCode;
    const hours      = appState.cells?.[dk]?.[colId]?.hours ?? "";
    const sc         = statusClass(display);

    cells += `
      <div class="cal-cell ${isWe ? "we" : ""} ${sc}">
        <div class="d">${day}</div>
        <div>
          <div class="v">${display || ""}</div>
          ${hours !== "" ? `<div class="h">${hours}h</div>` : ""}
        </div>
      </div>`;
  }

  document.getElementById("calModalTitle").textContent =
    `${col.title || colId} · ${monthTitle(year, month0)}`;

  document.getElementById("calModalGrid").innerHTML = `
    <div class="cal-wd-row">
      ${WEEKDAYS.map((d) => `<div class="cal-wd">${d}</div>`).join("")}
    </div>
    <div class="cal-grid">${cells}</div>`;

  document.getElementById("calendarModal").style.display = "flex";
}

export function closeCalendarModal() {
  document.getElementById("calendarModal").style.display = "none";
}
