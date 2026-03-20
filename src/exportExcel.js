import { appState } from "./state.js";
import {
  pad2,
  dateKey,
  daysInMonth,
  weekdayShort,
  isWeekend,
} from "./dateUtils.js";

export function exportToExcel() {
  if (typeof XLSX === "undefined") {
    alert(
      "XLSX ist nicht geladen. Prüfe lib/xlsx.bundle.js und Script-Reihenfolge.",
    );
    return;
  }

  const workbook = XLSX.utils.book_new();
  const days = daysInMonth(appState.year, appState.month0);

  const excelRows = [];
  excelRows.push(["Tag", ...appState.columns.map((c) => c.title)]);

  const sumHoursByColumn = Object.fromEntries(
    appState.columns.map((c) => [c.id, 0]),
  );
  const sumNightByColumn = Object.fromEntries(
    appState.columns.map((c) => [c.id, 0]),
  );
  const sumOnCallByColumn = Object.fromEntries(
    appState.columns.map((c) => [c.id, 0]),
  );

  for (let day = 1; day <= days; day++) {
    const dk = dateKey(appState.year, appState.month0, day);
    const weekday = weekdayShort(appState.year, appState.month0, day);
    const row = [`${pad2(day)}. ${weekday}`];

    for (const column of appState.columns) {
      const cell = appState.cells?.[dk]?.[column.id];
      if (!cell) {
        row.push("");
        continue;
      }

      const code = (cell.code ?? "").trim();
      const hoursRaw = cell.hours;

      const hoursNumber = Number(String(hoursRaw ?? "").replace(",", "."));
      if (!Number.isNaN(hoursNumber) && hoursNumber > 0) {
        sumHoursByColumn[column.id] += hoursNumber;
      }

      if (code.toUpperCase() === "N") sumNightByColumn[column.id] += 1;
      if (code.toUpperCase() === "R") sumOnCallByColumn[column.id] += 1;

      row.push(
        hoursRaw !== "" && typeof hoursRaw !== "undefined"
          ? `${code} (${hoursRaw})`
          : code,
      );
    }

    excelRows.push(row);
  }

  excelRows.push([]);

  excelRows.push([
    "Ist-Stunden",
    ...appState.columns.map((c) => Number(sumHoursByColumn[c.id].toFixed(2))),
  ]);

  excelRows.push(["Soll-Stunden", ...appState.columns.map(() => "")]);

  excelRows.push([
    "Nachtbereitschaften",
    ...appState.columns.map((c) => sumNightByColumn[c.id]),
  ]);

  excelRows.push([
    "Rufbereitschaften",
    ...appState.columns.map((c) => sumOnCallByColumn[c.id]),
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(excelRows);

  worksheet["!cols"] = [
    { wch: 10 },
    ...appState.columns.map(() => ({ wch: 14 })),
  ];

  const range = XLSX.utils.decode_range(worksheet["!ref"]);

  const thinBorder = {
    top: { style: "thin", color: { rgb: "9AA4B2" } },
    bottom: { style: "thin", color: { rgb: "9AA4B2" } },
    left: { style: "thin", color: { rgb: "9AA4B2" } },
    right: { style: "thin", color: { rgb: "9AA4B2" } },
  };

  const headerFill = { patternType: "solid", fgColor: { rgb: "1B1F2A" } };
  const weekendFill = { patternType: "solid", fgColor: { rgb: "FAFAFA" } };
  const footerFill = { patternType: "solid", fgColor: { rgb: "151922" } };
  const onCallFill = { patternType: "solid", fgColor: { rgb: "FFF9DB" } };

  function ensureExcelCell(rowIndex, colIndex) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    if (!worksheet[addr]) worksheet[addr] = { t: "s", v: "" };
    if (!worksheet[addr].s) worksheet[addr].s = {};
    return worksheet[addr];
  }

  const firstFooterRow = days + 2;
  const lastFooterRow = days + 5;

  for (let r = range.s.r; r <= range.e.r; r++) {
    const isHeaderRow = r === 0;
    const isDayRow = r >= 1 && r <= days;
    // r == day number: Row 0 = Header, Row 1 = Tag 1, ..., Row N = Tag N
    const isWeekendRow =
      isDayRow && isWeekend(appState.year, appState.month0, r);
    const isFooterRow = r >= firstFooterRow && r <= lastFooterRow;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ensureExcelCell(r, c);

      cell.s.border = thinBorder;
      cell.s.alignment = {
        vertical: "center",
        horizontal: c === 0 ? "left" : "center",
        wrapText: false,
      };

      if (isHeaderRow) {
        cell.s.font = { bold: true, color: { rgb: "FFFFFF" } };
        cell.s.fill = headerFill;
        continue;
      }

      if (isFooterRow) {
        cell.s.font = { bold: true, color: { rgb: "FFFFFF" } };
        cell.s.fill = footerFill;

        if (r === firstFooterRow && c >= 1) {
          const raw = excelRows[r][c];
          if (typeof raw === "number") {
            cell.t = "n";
            cell.v = raw;
            cell.s.numFmt = "0.00";
          }
        }
        continue;
      }

      if (isWeekendRow) {
        cell.s.fill = weekendFill;
      }

      const rawText = excelRows[r]?.[c];
      if (
        typeof rawText === "string" &&
        rawText.trim().toUpperCase().startsWith("R")
      ) {
        cell.s.fill = onCallFill;
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, "Monatsplan");

  const monthName = new Date(
    appState.year,
    appState.month0,
    1,
  ).toLocaleDateString("de-DE", { month: "long" });

  const filename = `Teamplan_${monthName}_${appState.year}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
