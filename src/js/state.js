const _now = new Date();

function _loadState() {
  try {
    const saved = localStorage.getItem("noxus-teamplan");
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

const _saved = _loadState();

export const appState = {
  year: _saved?.year ?? _now.getFullYear(),
  month0: _saved?.month0 ?? _now.getMonth(),
  columns:
    _saved?.columns ??
    Array.from({ length: 7 }, (_, i) => ({ id: `c${i + 1}`, title: "", soll: "" })),
  cells: _saved?.cells ?? {},
};

export function saveState() {
  localStorage.setItem(
    "noxus-teamplan",
    JSON.stringify({
      year: appState.year,
      month0: appState.month0,
      columns: appState.columns,
      cells: appState.cells,
    }),
  );
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

export function effectiveCode(dk, colId) {
  const stored = appState.cells?.[dk]?.[colId]?.code ?? "";
  if (stored !== "") return stored;
  const [y, m, d] = dk.split("-").map(Number);
  const prev = new Date(y, m - 1, d - 1);
  const prevDk = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
  const prevCode = appState.cells?.[prevDk]?.[colId]?.code ?? "";
  return prevCode.trim().toUpperCase() === "N" ? "X" : "";
}

export function nextColumnId() {
  const maxNum = Math.max(
    0,
    ...appState.columns.map((c) => Number(String(c.id).slice(1)) || 0),
  );
  return `c${maxNum + 1}`;
}
