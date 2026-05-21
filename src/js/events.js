import {
  appState,
  nextColumnId,
  getOrCreateCell,
  cleanupCell,
  saveState,
  toggleManualCovered,
} from "./state.js";
import { renderPlanTable } from "./tableRender.js";
import { exportToExcel } from "./exportExcel.js";
import { openCalendarModal, closeCalendarModal } from "./calendarModal.js";

export function wireEvents(dom) {
  let _pendingFocus = null; // { attr, key }

  // Track which input the user is interacting with so we can restore focus
  // after the full innerHTML re-render. Now wired on BOTH mousedown and
  // keydown (Tab), which fixes the upstream TODO about losing focus on Tab.
  function rememberFocus(el) {
    if (!el || el.tagName !== "INPUT") { _pendingFocus = null; return; }
    const a =
      el.getAttribute("data-code")    ? { attr: "data-code",    key: el.getAttribute("data-code") } :
      el.getAttribute("data-hours")   ? { attr: "data-hours",   key: el.getAttribute("data-hours") } :
      el.getAttribute("data-soll")    ? { attr: "data-soll",    key: el.getAttribute("data-soll") } :
      el.getAttribute("data-coltitle")? { attr: "data-coltitle",key: el.getAttribute("data-coltitle") } :
      el.getAttribute("data-comment") ? { attr: "data-comment", key: el.getAttribute("data-comment") } :
      null;
    _pendingFocus = a;
  }

  dom.planTable.addEventListener("mousedown", (e) => {
    const input = e.target.tagName === "INPUT"
      ? e.target
      : e.target.closest("td")?.querySelector("input[data-code]") ?? e.target.closest("td")?.querySelector("input");
    rememberFocus(input);
  });

  dom.planTable.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    // After Tab, the browser will move focus to the next focusable input
    // BEFORE focusout fires. We can't know its data-* yet, so we let the
    // browser do its thing and only fix the re-render path by deferring
    // refocus to the next animation frame.
    _pendingFocus = { defer: true };
  });

  dom.addColBtn.addEventListener("click", () => {
    appState.columns.push({ id: nextColumnId(), title: "Neu", soll: "" });
    saveState();
    renderPlanTable(dom);
  });

  dom.prevMonth.addEventListener("click", () => {
    appState.month0--;
    if (appState.month0 < 0) { appState.month0 = 11; appState.year--; }
    saveState();
    renderPlanTable(dom);
  });

  dom.nextMonth.addEventListener("click", () => {
    appState.month0++;
    if (appState.month0 > 11) { appState.month0 = 0; appState.year++; }
    saveState();
    renderPlanTable(dom);
  });

  // Live column-title input (no re-render needed — title is only echoed in the avatar pill)
  dom.planTable.addEventListener("input", (e) => {
    const t = e.target;
    const colId = t.getAttribute?.("data-coltitle");
    if (!colId) return;
    const col = appState.columns.find((c) => c.id === colId);
    if (!col) return;
    col.title = t.value;
    // Update avatar live without full re-render
    const av = t.closest(".person")?.querySelector(".av");
    if (av) av.textContent = (t.value.trim()[0] || "?").toUpperCase() +
                              (t.value.trim().split(/\s+/)[1]?.[0] || "").toUpperCase();
    saveState();
  });

  dom.planTable.addEventListener("click", (e) => {
    if (e.target.tagName === "INPUT") return;

    const calBtn = e.target.closest?.("[data-calview]");
    if (calBtn) { openCalendarModal(calBtn.getAttribute("data-calview")); return; }

    const coverBtn = e.target.closest?.("[data-togglecover]");
    if (coverBtn) {
      toggleManualCovered(coverBtn.getAttribute("data-togglecover"));
      saveState();
      renderPlanTable(dom);
      return;
    }

    const td = e.target.closest("td");
    if (td) {
      const input = td.querySelector("input[data-code]") ?? td.querySelector("input");
      input?.focus();
    }

    const delBtn = e.target.closest?.("[data-coldelete]");
    if (!delBtn) return;
    const colId = delBtn.getAttribute("data-coldelete");
    appState.columns = appState.columns.filter((c) => c.id !== colId);

    for (const dk of Object.keys(appState.cells)) {
      delete appState.cells[dk]?.[colId];
      if (appState.cells[dk] && Object.keys(appState.cells[dk]).length === 0) {
        delete appState.cells[dk];
      }
    }
    saveState();
    renderPlanTable(dom);
  });

  dom.exportExcelBtn.addEventListener("click", exportToExcel);

  document.getElementById("calModalClose").addEventListener("click", closeCalendarModal);
  document.getElementById("calModalPrint").addEventListener("click", () => window.print());
  document.getElementById("calendarModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeCalendarModal();
  });

  // Re-render after edits + restore focus to the same data-* hook
  dom.planTable.addEventListener("focusout", (e) => {
    const t = e.target;

    function refocusAfterRender() {
      // If we deferred (Tab key), let the browser settle and pick the new active element.
      requestAnimationFrame(() => {
        if (!_pendingFocus) return;
        if (_pendingFocus.defer) { _pendingFocus = null; return; }
        const next = dom.planTable.querySelector(`[${_pendingFocus.attr}="${_pendingFocus.key}"]`);
        next?.focus();
        _pendingFocus = null;
      });
    }

    const codeKey = t.getAttribute?.("data-code");
    if (codeKey) {
      const [dk, colId] = codeKey.split("|");
      const newCode = t.value.trim();
      if (newCode === (appState.cells?.[dk]?.[colId]?.code ?? "")) return;
      const cell = getOrCreateCell(dk, colId);
      cell.code = newCode.toUpperCase();
      cleanupCell(dk, colId);
      saveState();
      renderPlanTable(dom);
      refocusAfterRender();
      return;
    }

    const hoursKey = t.getAttribute?.("data-hours");
    if (hoursKey) {
      const [dk, colId] = hoursKey.split("|");
      const raw = t.value.trim().replace(",", ".");
      const num = raw === "" ? "" : Number(raw);
      const newHours = Number.isNaN(num) ? "" : num;
      if (newHours === (appState.cells?.[dk]?.[colId]?.hours ?? "")) return;
      const cell = getOrCreateCell(dk, colId);
      cell.hours = newHours;
      cleanupCell(dk, colId);
      saveState();
      renderPlanTable(dom);
      refocusAfterRender();
      return;
    }

    const sollKey = t.getAttribute?.("data-soll");
    if (sollKey) {
      const col = appState.columns.find((c) => c.id === sollKey);
      if (!col) return;
      const raw = t.value.trim().replace(",", ".");
      const num = raw === "" ? "" : Number(raw);
      const newSoll = Number.isNaN(num) ? "" : num;
      if (newSoll === (col.soll ?? "")) return;
      col.soll = newSoll;
      saveState();
      // Soll affects the Δ stats footer — re-render needed.
      renderPlanTable(dom);
      refocusAfterRender();
      return;
    }

    const commentKey = t.getAttribute?.("data-comment");
    if (commentKey) {
      const newVal = t.value;
      if (newVal === (appState.comments[commentKey] ?? "")) return;
      if (newVal === "") delete appState.comments[commentKey];
      else appState.comments[commentKey] = newVal;
      saveState();
    }
  });
}
