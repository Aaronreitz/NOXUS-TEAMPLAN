import { appState, effectiveCode } from "./state.js";
import { daysInMonth, monthTitle, dateKey } from "./dateUtils.js";

function cellBg(code) {
  switch (code.trim().toUpperCase()) {
    case "N":  return "#1a2d50";
    case "TD": return "#142d25";
    case "X":  return "#181f38";
    case "U":  return "#332815";
    case "KR": return "#2e1520";
    default:   return "";
  }
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
    if (day < 1 || day > days) {
      const colIdx = i % 7;
      const isWe = colIdx >= 5;
      cells += `<div class="rounded" style="height:3.5rem;background-color:${isWe ? '#110d0f' : '#12141c'};border:1px dashed ${isWe ? '#1e151a' : '#1a1d27'};opacity:0.5"></div>`;
      continue;
    }

    const dk = dateKey(year, month0, day);
    const storedCode = appState.cells?.[dk]?.[colId]?.code ?? "";
    const effCode = effectiveCode(dk, colId);
    const displayCode = storedCode || effCode;
    const hours = appState.cells?.[dk]?.[colId]?.hours ?? "";
    const bg = cellBg(displayCode);
    const colIdx = i % 7;
    const isWeekend = colIdx >= 5;
    const bgStyle = bg
      ? `background-color:${bg}`
      : isWeekend
        ? "background-color:#1e1215"
        : "background-color:#1a1f2e";
    const borderColor = isWeekend ? "#3a1a22" : "#2a2f3a";

    cells += `
      <div class="rounded p-1.5 flex flex-col justify-between" style="height:3.5rem;${bgStyle};border:1px solid ${borderColor}">
        <span class="text-[10px] font-semibold ${isWeekend ? "text-red-400" : "text-noxus-ash"}">${day}</span>
        <div class="text-center leading-none">
          <div class="text-xs font-bold">${displayCode}</div>
          ${hours !== "" ? `<div class="text-[9px] text-noxus-ash mt-0.5">${hours}h</div>` : ""}
        </div>
      </div>`;
  }

  document.getElementById("calModalTitle").textContent =
    `${col.title || colId} – ${monthTitle(year, month0)}`;

  document.getElementById("calModalGrid").innerHTML = `
    <div class="grid grid-cols-7 gap-1 mb-1">
      ${WEEKDAYS.map((d) => `<div class="text-center text-[11px] text-noxus-ash font-semibold">${d}</div>`).join("")}
    </div>
    <div class="grid grid-cols-7 gap-1">${cells}</div>`;

  document.getElementById("calendarModal").style.display = "flex";
}

export function closeCalendarModal() {
  document.getElementById("calendarModal").style.display = "none";
}
