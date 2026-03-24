import { appState, effectiveCode } from "./state.js";
import {
  pad2,
  dateKey,
  daysInMonth,
  weekdayShort,
  isWeekend,
  monthTitle,
} from "./dateUtils.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderPlanTable(dom) {
  dom.monthTitle.textContent = monthTitle(appState.year, appState.month0);

  const days = daysInMonth(appState.year, appState.month0);
  const sumHours = Object.fromEntries(appState.columns.map((c) => [c.id, 0]));
  const sumDays  = Object.fromEntries(appState.columns.map((c) => [c.id, 0]));
  const sumNight = Object.fromEntries(appState.columns.map((c) => [c.id, 0]));

  const thead = `
    <thead>
      <tr>
        <th class="sticky top-0 left-0 z-30 bg-noxus-panel border-b border-noxus-steel px-2 py-1 w-16">Tag</th>
        ${appState.columns
          .map(
            (c) => `
          <th class="sticky top-0 z-20 bg-noxus-panel border-b border-noxus-steel px-2 py-1 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <input class="w-20 bg-noxus-bg border border-noxus-steel rounded-md px-2 py-1 text-xs"
                     value="${escapeHtml(c.title)}" data-coltitle="${c.id}" />
              <button class="px-2 py-1 rounded-md border border-noxus-steel hover:bg-noxus-panel text-muted text-xs"
                      data-coldelete="${c.id}">✕</button>
            </div>
          </th>
        `,
          )
          .join("")}
      </tr>
    </thead>
  `;

  let body = "";

  for (let d = 1; d <= days; d++) {
    const dk = dateKey(appState.year, appState.month0, d);
    const wk = weekdayShort(appState.year, appState.month0, d);
    const weekend = isWeekend(appState.year, appState.month0, d);

    const rowClass = weekend ? "bg-noxus-red/10" : "";
    const leftBg = weekend ? "bg-noxus-red/15" : "bg-noxus-panel";

    body += `<tr class="${rowClass}">`;
    body += `
      <td class="sticky left-0 z-10 ${leftBg} border-b border-noxus-steel px-2 py-0.5 leading-tight">
        <div class="text-xs font-semibold">${pad2(d)}.</div>
        <div class="text-[10px] text-muted">${wk}</div>
      </td>
    `;

    for (const col of appState.columns) {
      const cell = appState.cells?.[dk]?.[col.id] ?? { code: "", hours: "" };
      const codeVal = cell.code ?? "";
      const effCode = effectiveCode(dk, col.id);
      const hoursVal = (cell.hours ?? "") === 0 ? "0" : (cell.hours ?? "");

      if (effCode !== "") sumDays[col.id] += 1;

      const hoursNum = Number(String(cell.hours ?? "").replace(",", "."));
      if (!Number.isNaN(hoursNum) && hoursNum > 0) sumHours[col.id] += hoursNum;

      if (codeVal.trim().toUpperCase() === "N") sumNight[col.id] += 1;

      body += `
        <td class="border-b border-noxus-steel px-1 py-0.5">
          <div class="grid grid-cols-[1fr_auto] items-center gap-1">
            <input class="w-full h-5 rounded border border-noxus-steel bg-noxus-bg/60 px-1.5 text-xs leading-none"
                   value="${escapeHtml(codeVal)}" placeholder="${escapeHtml(effCode)}" data-code="${dk}|${col.id}" />
            <input class="w-12 h-5 rounded border border-noxus-steel bg-noxus-bg/40 px-1 text-[10px] leading-none text-right tabular-nums"
                   value="${escapeHtml(String(hoursVal))}" data-hours="${dk}|${col.id}" inputmode="decimal" />
          </div>
        </td>
      `;
    }

    body += `</tr>`;
  }

  const footerRow = (label, cells) => `
    <tr>
      <th class="sticky left-0 bg-noxus-panel border-t border-noxus-steel px-2 py-1 text-xs">${label}</th>
      ${cells}
    </tr>
  `;

  const cell = (content) =>
    `<td class="bg-noxus-panel border-t border-noxus-steel px-2 py-1 text-right font-semibold text-xs tabular-nums">${content}</td>`;

  const tfoot = `
    <tfoot>
      ${footerRow("Soll", appState.columns.map((c) => `
        <td class="bg-noxus-panel border-t border-noxus-steel px-1 py-0.5">
          <input class="w-full h-5 rounded border border-noxus-steel bg-noxus-bg/40 px-1 text-xs text-right tabular-nums"
                 value="${escapeHtml(String(c.soll ?? ""))}" data-soll="${c.id}" inputmode="decimal" />
        </td>
      `).join(""))}
      ${footerRow("Ist",  appState.columns.map((c) => cell(sumHours[c.id].toFixed(2))).join(""))}
      ${footerRow("NB's", appState.columns.map((c) => cell(sumNight[c.id])).join(""))}
      ${footerRow("Tage", appState.columns.map((c) => cell(sumDays[c.id])).join(""))}
    </tfoot>
  `;

  dom.planTable.innerHTML = thead + `<tbody>${body}</tbody>` + tfoot;
}
