export const pad2 = (n) => String(n).padStart(2, "0");
export const dateKey = (y, m0, d) => `${y}-${pad2(m0 + 1)}-${pad2(d)}`;

export function monthTitle(y, m0) {
  return new Date(y, m0, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}
export function daysInMonth(y, m0) {
  return new Date(y, m0 + 1, 0).getDate();
}
export function weekdayShort(y, m0, d) {
  return new Date(y, m0, d).toLocaleDateString("de-DE", { weekday: "short" });
}
export function isWeekend(y, m0, d) {
  const js = new Date(y, m0, d).getDay(); // 0=So..6=Sa
  return js === 0 || js === 6;
}
