import { appState, effectiveCode } from "./state.js";
import {
  pad2,
  dateKey,
  daysInMonth,
  weekdayShort,
  isWeekend,
  monthTitle,
} from "./dateUtils.js";

/* ---------- helpers ---------- */

function statusClass(code) {
  const c = String(code || "").trim().toUpperCase();
  if (c.startsWith("KR")) return "s-kr";
  if (c.startsWith("TD")) return "s-td";
  if (c.startsWith("N"))  return "s-n";
  if (c.startsWith("X"))  return "s-x";
  if (c.startsWith("U"))  return "s-u";
  return "";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/* Inline SVG icons (Lucide-style). Keep monochrome. */
const SVG_CAL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>';
const SVG_X =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const SVG_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

/* ---------- main render ---------- */

export function renderPlanTable(dom) {
  dom.monthTitle.textContent = monthTitle(appState.year, appState.month0);

  const days = daysInMonth(appState.year, appState.month0);
  const sumHours = Object.fromEntries(appState.columns.map((c) => [c.id, 0]));
  const sumDays  = Object.fromEntries(appState.columns.map((c) => [c.id, 0]));
  const sumNight = Object.fromEntries(appState.columns.map((c) => [c.id, 0]));

  /* ---------- thead — person cards ---------- */
  const thead = `
    <thead>
      <tr>
        <th class="day-th">Tag</th>
        ${appState.columns.map((c) => `
          <th>
            <div class="person">
              <div class="who">
                <input class="name" value="${escapeHtml(c.title)}" data-coltitle="${c.id}" />
              </div>
              <div class="meta">
                <button data-calview="${c.id}" title="Kalender" aria-label="Kalender">${SVG_CAL}</button>
                <button class="danger" data-coldelete="${c.id}" title="Entfernen" aria-label="Entfernen">${SVG_X}</button>
              </div>
            </div>
          </th>
        `).join("")}
        <th class="comment-th">Kommentar</th>
      </tr>
    </thead>
  `;

  /* ---------- tbody — one row per day ---------- */
  let body = "";
  for (let d = 1; d <= days; d++) {
    const dk = dateKey(appState.year, appState.month0, d);
    const wk = weekdayShort(appState.year, appState.month0, d).replace(".", "");
    const weekend = isWeekend(appState.year, appState.month0, d);
    const sat = new Date(appState.year, appState.month0, d).getDay() === 6;

    const hasN = appState.columns.some(
      (c) => (appState.cells?.[dk]?.[c.id]?.code ?? "").trim().toUpperCase().startsWith("N"),
    );
    const hasTD = appState.columns.some(
      (c) => (appState.cells?.[dk]?.[c.id]?.code ?? "").trim().toUpperCase().startsWith("TD"),
    );
    const covered = hasN && hasTD;
    const manualCov = appState.manualCovered?.[dk] ?? false;

    let coverEl;
    if (covered || manualCov) {
      coverEl = `<button data-togglecover="${dk}" class="cover ok" title="Tag gedeckt – klicken zum Entfernen des manuellen Hakens">${SVG_CHECK}</button>`;
    } else {
      coverEl = `<button data-togglecover="${dk}" class="cover dot" title="Klicken für manuellen Haken">·</button>`;
    }

    const trClass = [weekend ? "weekend" : "", sat ? "sat" : ""].filter(Boolean).join(" ");

    body += `<tr class="${trClass}">`;
    body += `
      <td class="day-cell">
        <div class="row">
          <span class="dnum">${pad2(d)}</span>
          <span class="wk">${escapeHtml(wk)}</span>
          ${coverEl}
        </div>
      </td>
    `;

    for (const col of appState.columns) {
      const cell = appState.cells?.[dk]?.[col.id] ?? { code: "", hours: "" };
      const codeVal  = cell.code ?? "";
      const effCode  = effectiveCode(dk, col.id);
      const hoursVal = (cell.hours ?? "") === 0 ? "0" : (cell.hours ?? "");

      if (effCode !== "" && !/^-+$/.test(effCode.trim())) sumDays[col.id] += 1;
      const hoursNum = Number(String(cell.hours ?? "").replace(",", "."));
      if (!Number.isNaN(hoursNum) && hoursNum > 0) sumHours[col.id] += hoursNum;
      if (codeVal.trim().toUpperCase().startsWith("N")) sumNight[col.id] += 1;

      const stCls = statusClass(effCode);
      body += `
        <td>
          <div class="shift ${stCls}">
            <input class="code" value="${escapeHtml(codeVal)}" placeholder="${escapeHtml(effCode || "—")}"
                   data-code="${dk}|${col.id}" />
            <input class="hours" value="${escapeHtml(String(hoursVal))}" placeholder="—"
                   data-hours="${dk}|${col.id}" inputmode="decimal" />
          </div>
        </td>
      `;
    }

    const commentVal = appState.comments?.[dk] ?? "";
    body += `
      <td>
        <input class="cmt" value="${escapeHtml(commentVal)}" placeholder="—" data-comment="${dk}" />
      </td>
    `;
    body += `</tr>`;
  }

  /* ---------- tfoot — 4 schmale Zeilen: Soll, Ist, NB's, Tage ---------- */
  const cmtCell = (key) => `
    <td class="cmt-cell">
      <input class="cmt" value="${escapeHtml(appState.comments?.[key] ?? "")}" data-comment="${key}" />
    </td>
  `;

  const sollRow = `
    <tr class="foot-row first">
      <th class="foot-label">Soll</th>
      ${appState.columns.map((c) => `
        <td>
          <input class="foot-input" value="${escapeHtml(String(c.soll ?? ""))}" placeholder="—"
                 data-soll="${c.id}" inputmode="decimal" />
        </td>
      `).join("")}
      ${cmtCell("_soll")}
    </tr>
  `;

  const istRow = `
    <tr class="foot-row">
      <th class="foot-label">Ist · h</th>
      ${appState.columns.map((c) => {
        const ist = sumHours[c.id];
        const sollNum = Number(String(c.soll ?? "").replace(",", "."));
        const hasSoll = !Number.isNaN(sollNum) && c.soll !== "" && c.soll != null;
        const delta = hasSoll ? ist - sollNum : null;
        const cls = delta == null ? "" : delta < 0 ? "delta-under" : delta > 0 ? "delta-over" : "";
        return `<td class="num ${cls}">${ist.toFixed(2)}</td>`;
      }).join("")}
      ${cmtCell("_ist")}
    </tr>
  `;

  const nbRow = `
    <tr class="foot-row">
      <th class="foot-label">NB's</th>
      ${appState.columns.map((c) => `<td class="num">${sumNight[c.id]}</td>`).join("")}
      ${cmtCell("_nbs")}
    </tr>
  `;

  const tageRow = `
    <tr class="foot-row">
      <th class="foot-label">Tage</th>
      ${appState.columns.map((c) => `<td class="num">${sumDays[c.id]}</td>`).join("")}
      ${cmtCell("_tage")}
    </tr>
  `;

  const tfoot = `<tfoot>${sollRow}${istRow}${nbRow}${tageRow}</tfoot>`;

  dom.planTable.innerHTML = thead + `<tbody>${body}</tbody>` + tfoot;
}
