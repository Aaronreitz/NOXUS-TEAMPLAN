import { appState, effectiveCode } from "./state.js";
import {
  pad2,
  dateKey,
  daysInMonth,
  weekdayShort,
  isWeekend,
  monthTitle,
} from "./dateUtils.js";

function cellBgStyle(code) {
  switch (code.trim().toUpperCase()) {
    case "N":  return "background-color:#1a2d50;";
    case "TD": return "background-color:#142d25;";
    case "X":  return "background-color:#181f38;";
    case "U":  return "background-color:#332815;";
    case "KR": return "background-color:#2e1520;";
    default:   return "";
  }
}

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
        <th class="sticky top-0 left-0 z-30 bg-noxus-panel border-b-2 border-noxus-steel px-2 py-1 w-24">
          <div class="flex items-center gap-1.5">
            <span class="w-5 text-center text-green-400 text-xs flex-shrink-0">✓</span>
            <span>Tag</span>
          </div>
        </th>
        ${appState.columns
          .map(
            (c) => `
          <th class="sticky top-0 z-20 bg-noxus-panel border-b border-l-2 border-noxus-steel px-2 py-1 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <input class="w-20 bg-noxus-bg border border-noxus-steel rounded-md px-2 py-1 text-xs"
                     value="${escapeHtml(c.title)}" data-coltitle="${c.id}" />
              <button class="px-2 py-1 rounded-md border border-noxus-steel hover:bg-noxus-panel text-muted text-xs"
                      data-calview="${c.id}">⊞</button>
              <button class="px-2 py-1 rounded-md border border-noxus-steel hover:bg-noxus-panel text-muted text-xs"
                      data-coldelete="${c.id}">✕</button>
            </div>
          </th>
        `,
          )
          .join("")}
        <th class="sticky top-0 z-20 bg-noxus-panel border-b border-l-2 border-noxus-steel px-2 py-1 text-left text-xs font-bold" style="width:350px; min-width:350px;">Kommentar</th>
      </tr>
    </thead>
  `;

  let body = "";

  for (let d = 1; d <= days; d++) {
    const dk = dateKey(appState.year, appState.month0, d);
    const wk = weekdayShort(appState.year, appState.month0, d);
    const weekend = isWeekend(appState.year, appState.month0, d);

    const rowClass = weekend ? "bg-noxus-red/10" : "";
    // noxus-red (#8b1d2c) at 15% blended over noxus-panel (#151821) → opaque solid for sticky cell
    const leftBg = weekend ? "" : "bg-noxus-panel";
    const leftStyle = weekend ? 'style="background-color:#271923"' : "";
    const isSaturday = new Date(appState.year, appState.month0, d).getDay() === 6;
    const weBorder = weekend ? ";border-bottom-width:2px;border-bottom-color:#4a1a26" : "";
    const weSatTop = isSaturday ? ";border-top-width:2px;border-top-color:#4a1a26" : "";

    const hasN = appState.columns.some(
      (col) => (appState.cells?.[dk]?.[col.id]?.code ?? "").trim().toUpperCase() === "N",
    );
    const hasTD = appState.columns.some(
      (col) => (appState.cells?.[dk]?.[col.id]?.code ?? "").trim().toUpperCase() === "TD",
    );
    const covered = hasN && hasTD;
    const manualCov = appState.manualCovered?.[dk] ?? false;

    let coverEl;
    if (covered) {
      coverEl = `<span class="w-5 text-center text-green-400 font-bold flex-shrink-0">✓</span>`;
    } else if (manualCov) {
      coverEl = `<button data-togglecover="${dk}" class="w-5 text-center text-green-600 font-bold flex-shrink-0 hover:text-red-400 leading-none" title="Manueller Haken – klicken zum Entfernen">✓</button>`;
    } else {
      coverEl = `<button data-togglecover="${dk}" class="w-5 text-center text-noxus-steel flex-shrink-0 hover:text-green-400 leading-none text-base" title="Klicken für manuellen Haken">·</button>`;
    }

    body += `<tr class="${rowClass}">`;
    body += `
      <td class="sticky left-0 z-10 ${leftBg} border-b-2 border-noxus-steel px-2 py-0.5 w-24" ${weekend ? `style="background-color:#271923${weBorder}${weSatTop}"` : ""}>
        <div class="flex items-center gap-1.5">
          ${coverEl}
          <div class="leading-tight">
            <div class="text-xs font-semibold">${pad2(d)}.</div>
            <div class="text-[10px] text-muted">${wk}</div>
          </div>
        </div>
      </td>
    `;

    for (const col of appState.columns) {
      const cell = appState.cells?.[dk]?.[col.id] ?? { code: "", hours: "" };
      const codeVal = cell.code ?? "";
      const effCode = effectiveCode(dk, col.id);
      const hoursVal = (cell.hours ?? "") === 0 ? "0" : (cell.hours ?? "");

      if (effCode !== "" && !/^-+$/.test(effCode.trim())) sumDays[col.id] += 1;

      const hoursNum = Number(String(cell.hours ?? "").replace(",", "."));
      if (!Number.isNaN(hoursNum) && hoursNum > 0) sumHours[col.id] += hoursNum;

      if (codeVal.trim().toUpperCase() === "N") sumNight[col.id] += 1;

      body += `
        <td class="border-b border-l-2 border-noxus-steel px-1 py-0.5" style="${cellBgStyle(effCode)}${weBorder}${weSatTop}">
          <div class="grid grid-cols-[1fr_auto] items-center gap-1">
            <input class="w-full h-5 rounded border border-noxus-steel bg-noxus-bg/60 px-1.5 text-xs leading-none focus:outline-none focus:border-noxus-red focus:ring-1 focus:ring-noxus-red"
                   value="${escapeHtml(codeVal)}" placeholder="${escapeHtml(effCode)}" data-code="${dk}|${col.id}" />
            <input class="w-12 h-5 rounded border border-noxus-steel bg-noxus-bg/40 px-1 text-[10px] leading-none text-right tabular-nums focus:outline-none focus:border-noxus-red focus:ring-1 focus:ring-noxus-red"
                   value="${escapeHtml(String(hoursVal))}" data-hours="${dk}|${col.id}" inputmode="decimal" />
          </div>
        </td>
      `;
    }

    const commentVal = appState.comments?.[dk] ?? "";
    body += `
      <td class="border-b border-l-2 border-noxus-steel px-1 py-0.5" style="width:350px; min-width:350px;${weBorder}${weSatTop}">
        <input class="w-full h-5 rounded border border-noxus-steel bg-noxus-bg/30 px-1.5 text-xs leading-none focus:outline-none focus:border-noxus-red focus:ring-1 focus:ring-noxus-red"
               value="${escapeHtml(commentVal)}" data-comment="${dk}" />
      </td>
    `;
    body += `</tr>`;
  }

  const footerRow = (label, cells) => `
    <tr>
      <th class="sticky left-0 z-10 bg-noxus-panel border-t-2 border-noxus-steel px-2 py-1 text-xs w-24">
        <div class="flex items-center gap-1.5">
          <span class="w-5 flex-shrink-0"></span>
          <span>${label}</span>
        </div>
      </th>
      ${cells}
    </tr>
  `;

  const cell = (content) =>
    `<td class="bg-noxus-panel border-t border-l-2 border-noxus-steel px-2 py-1 text-right font-semibold text-xs tabular-nums">${content}</td>`;
  const commentCell = (key) => `
    <td class="bg-noxus-panel border-t border-l-2 border-noxus-steel px-1 py-0.5" style="width:350px; min-width:350px;">
      <input class="w-full h-5 rounded border border-noxus-steel bg-noxus-bg/30 px-1.5 text-xs leading-none focus:outline-none focus:border-noxus-red focus:ring-1 focus:ring-noxus-red"
             value="${escapeHtml(appState.comments?.[key] ?? "")}" data-comment="${key}" />
    </td>`;

  const tfoot = `
    <tfoot>
      ${footerRow("Soll", appState.columns.map((c) => `
        <td class="bg-noxus-panel border-t border-l-2 border-noxus-steel px-1 py-0.5">
          <input class="w-full h-5 rounded border border-noxus-steel bg-noxus-bg/40 px-1 text-xs text-right tabular-nums focus:outline-none focus:border-noxus-red focus:ring-1 focus:ring-noxus-red"
                 value="${escapeHtml(String(c.soll ?? ""))}" data-soll="${c.id}" inputmode="decimal" />
        </td>
      `).join("") + commentCell("_soll"))}
      ${footerRow("Ist",  appState.columns.map((c) => cell(sumHours[c.id].toFixed(2))).join("") + commentCell("_ist"))}
      ${footerRow("NB's", appState.columns.map((c) => cell(sumNight[c.id])).join("") + commentCell("_nbs"))}
      ${footerRow("Tage", appState.columns.map((c) => cell(sumDays[c.id])).join("") + commentCell("_tage"))}

    </tfoot>
  `;

  dom.planTable.innerHTML = thead + `<tbody>${body}</tbody>` + tfoot;
}
