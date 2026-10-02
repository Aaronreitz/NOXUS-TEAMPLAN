import { dateKey, monthKey, daysInMonth } from "./dateUtils.js";
import { scheduleBackup } from "./backup.js";

const _now = new Date();

function _loadState() {
  try {
    const saved = localStorage.getItem("noxus-teamplan");
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/* Validates a saved/imported state and upgrades old formats. Throws on
   anything that isn't a Teamplan state, so nothing gets half-overwritten. */
function normalizeState(data) {
  if (
    !isObj(data) ||
    !Number.isInteger(data.year) ||
    !Number.isInteger(data.month0) || data.month0 < 0 || data.month0 > 11 ||
    !Array.isArray(data.columns) ||
    !data.columns.every((c) => isObj(c) && typeof c.id === "string") ||
    !isObj(data.cells)
  ) {
    throw new Error("Keine gültige Teamplan-Sicherung.");
  }
  const soll = isObj(data.soll) ? data.soll : {};
  // Before 1.2.1 Soll was stored per column for all months. Keep those values
  // for the month that was open, every other month starts empty.
  const mk = monthKey(data.year, data.month0);
  const columns = data.columns.map(({ soll: legacy, ...col }) => {
    if (legacy !== undefined && legacy !== "" && legacy !== null) {
      soll[mk] ??= {};
      soll[mk][col.id] ??= legacy;
    }
    return col;
  });
  return {
    year: data.year,
    month0: data.month0,
    columns,
    cells: data.cells,
    soll,
    comments: isObj(data.comments) ? data.comments : {},
    manualCovered: isObj(data.manualCovered) ? data.manualCovered : {},
  };
}

function _initialState() {
  const saved = _loadState();
  if (saved) {
    try {
      return normalizeState(saved);
    } catch {
      // Unreadable data must not be overwritten by the next save.
      localStorage.setItem(`noxus-teamplan-defekt-${Date.now()}`, JSON.stringify(saved));
    }
  }
  return {
    year: _now.getFullYear(),
    month0: _now.getMonth(),
    columns: Array.from({ length: 7 }, (_, i) => ({ id: `c${i + 1}`, title: "" })),
    cells: {},
    soll: {},
    comments: {},
    manualCovered: {},
  };
}

export const appState = _initialState();

export function serializeState() {
  return JSON.stringify(appState);
}

export function saveState() {
  localStorage.setItem("noxus-teamplan", serializeState());
  scheduleBackup();
}

/* Replaces the whole state, e.g. from a backup file or an undo snapshot. */
export function replaceState(data) {
  Object.assign(appState, normalizeState(data));
}

/* Soll is stored per month; a month without entries starts empty. */
export function getSoll(colId) {
  return appState.soll[monthKey(appState.year, appState.month0)]?.[colId] ?? "";
}

export function setSoll(colId, value) {
  const mk = monthKey(appState.year, appState.month0);
  if (value === "") {
    delete appState.soll[mk]?.[colId];
    if (appState.soll[mk] && Object.keys(appState.soll[mk]).length === 0) delete appState.soll[mk];
  } else {
    (appState.soll[mk] ??= {})[colId] = value;
  }
}

export function getOrCreateCell(dateKeyStr, colId) {
  appState.cells[dateKeyStr] ??= {};
  appState.cells[dateKeyStr][colId] ??= { code: "", hours: "" };
  return appState.cells[dateKeyStr][colId];
}

export function cleanupCell(dateKeyStr, colId) {
  const cell = appState.cells?.[dateKeyStr]?.[colId];
  if (!cell) return;

  const codeEmpty = !cell.code || cell.code.trim() === "";
  const hoursEmpty =
    cell.hours === "" ||
    cell.hours === null ||
    typeof cell.hours === "undefined";

  if (codeEmpty && hoursEmpty) {
    delete appState.cells[dateKeyStr][colId];
    if (Object.keys(appState.cells[dateKeyStr]).length === 0) {
      delete appState.cells[dateKeyStr];
    }
  }
}

/* effectiveCode: if a cell is empty and the previous day stored "N",
   show "X" as a visual placeholder (not persisted). Uses dateKey from
   dateUtils so the date format stays in sync. */
export function effectiveCode(dk, colId) {
  const stored = appState.cells?.[dk]?.[colId]?.code ?? "";
  if (stored !== "") return stored;
  const [y, m, d] = dk.split("-").map(Number);
  const prev = new Date(y, m - 1, d - 1);
  const prevDk = dateKey(prev.getFullYear(), prev.getMonth(), prev.getDate());
  const prevCode = appState.cells?.[prevDk]?.[colId]?.code ?? "";
  return prevCode.trim().toUpperCase().startsWith("N") ? "X" : "";
}

/* Code semantics live here so table, calendar and Excel export agree. */
export function statusClass(code) {
  const c = String(code || "").trim().toUpperCase();
  if (c.startsWith("KR")) return "s-kr";
  if (c.startsWith("FOBI")) return "s-fobi";
  if (c.startsWith("TD")) return "s-td";
  if (c.startsWith("N"))  return "s-n";
  if (c.startsWith("X"))  return "s-x";
  if (c.startsWith("TB") || c.startsWith("SV")) return "s-tb"; // Teambesprechung / Supervision
  // RT (Regenerationstag) is treated like special leave, so it shares U's color.
  if (c.startsWith("U") || c.startsWith("RT")) return "s-u";
  return "";
}

export function parseNumber(raw) {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (s === "") return "";
  const n = Number(s);
  return Number.isNaN(n) ? "" : n;
}

/* Per-column month totals: hours (Ist), working days (Tage), night shifts (NB's). */
export function computeColumnSums(year, month0) {
  const sums = Object.fromEntries(
    appState.columns.map((c) => [c.id, { hours: 0, days: 0, nights: 0 }]),
  );
  for (let d = 1; d <= daysInMonth(year, month0); d++) {
    const dk = dateKey(year, month0, d);
    for (const col of appState.columns) {
      const s = sums[col.id];
      const cell = appState.cells?.[dk]?.[col.id];
      const eff = effectiveCode(dk, col.id).trim();
      // "-" / "--" mark an explicit free day and don't count as worked.
      if (eff !== "" && !/^-+$/.test(eff)) s.days += 1;
      const hours = parseNumber(cell?.hours);
      if (hours !== "" && hours > 0) s.hours += hours;
      if ((cell?.code ?? "").trim().toUpperCase().startsWith("N")) s.nights += 1;
    }
  }
  return sums;
}

export function toggleManualCovered(dk) {
  if (appState.manualCovered[dk]) {
    delete appState.manualCovered[dk];
  } else {
    appState.manualCovered[dk] = true;
  }
}

export function nextColumnId() {
  const maxNum = Math.max(
    0,
    ...appState.columns.map((c) => Number(String(c.id).slice(1)) || 0),
  );
  return `c${maxNum + 1}`;
}
