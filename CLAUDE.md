# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Tailwind CSS build + start Electron (development)
npm run build:css  # Tailwind compile only (styles/styles.css → dist.css)
npm run build      # Full Windows build → dist/NoxusTeamplan.zip
```

No test suite exists.

## Architecture

Electron desktop app — no bundler for JS. The browser process loads plain ES modules; only CSS goes through Tailwind.

**Entry points:**
- `electron/main.js` — creates `BrowserWindow`, loads `index.html`, handles zoom shortcuts and GitHub update check
- `index.html` — loads `src/lib/xlsx.bundle.js` (global `XLSX`) then `src/js/main.js` as ES module

**Frontend module flow:**
```
src/js/main.js
  ├── events.js        — event delegation on the table + nav/export buttons; mutates state then re-renders
  ├── state.js         — single `appState` object; persisted to localStorage as "noxus-teamplan"
  ├── tableRender.js   — full innerHTML re-render on every state change; rebuilds thead/tbody/tfoot
  ├── calendarModal.js — read-only per-column calendar overlay (⊞ button); supports browser print
  ├── exportExcel.js   — builds XLSX via global XLSX (SheetJS); styles cells directly
  ├── history.js       — undo/redo snapshots
  ├── backup.js        — debounced automatic backup via preload bridge
  └── dateUtils.js     — pure date helpers (pad2, dateKey, monthKey, daysInMonth, weekdayShort, isWeekend, monthTitle)
```

**State shape (`appState`):**
```js
{
  year: number,
  month0: number,           // 0-based month
  columns: [{ id, title }],
  cells: { "YYYY-MM-DD": { colId: { code, hours } } },
  soll: { "YYYY-MM": { colId: number } },  // per month, new months start empty
  comments: { "YYYY-MM-DD": string, "_soll"|"_ist"|"_nbs"|"_tage": string }
}
```

Cell keys use the format `"YYYY-MM-DD"` (from `dateUtils.dateKey`). Input `data-*` attributes encode lookups as `"YYYY-MM-DD|colId"`.

**N→X auto-fill logic:** `effectiveCode(dk, colId)` in `state.js` — if a cell has no stored code and the previous day's stored code is `"N"`, it returns `"X"` as a visual placeholder (not persisted).

**Calendar modal:** `calendarModal.js` renders a 7-column grid for one column's month. The `⊞` button in each column header triggers it via `data-calview="<colId>"`. Closing works by the ✕ button, clicking the backdrop, or printing via the browser print dialog (CSS hides everything except the modal during print).

**Shared code semantics:** `statusClass`, `parseNumber` and `computeColumnSums` in `state.js` are the single source for status colors (N, TD, X, U/RT, KR, TB/SV, FOBI) and the Ist/NB's/Tage totals — table, calendar modal and Excel export all use them. X days count toward "Tage" on purpose.

**Edit/render cycle (`events.js`):** `input` writes to state + localStorage on every keystroke; the full re-render is deferred to `focusout` (it would destroy the focused input) and then restores focus to `e.relatedTarget` via its `data-*` key, so Tab and clicks keep working. Column delete uses a two-click confirm (`.armed`) instead of `confirm()`, because native dialogs break input focus in Electron on Windows.

**Backup:** "Sichern"/"Laden" in the top bar export/import the whole state as JSON (`serializeState`/`replaceState`). `replaceState`/load go through `normalizeState`, which validates and migrates old data (pre-1.2.1 `column.soll` → `soll[month]`). Automatic daily backups: `backup.js` → `window.noxusBackup` (`electron/preload.js`) → IPC `backup:save` in `electron/main.js`, written to `Sicherungen/` next to the .exe (fallback/dev: userData), newest 30 kept.

**Undo:** `history.js` keeps whole-state snapshots; call `recordUndo()` right before any data change. Ctrl+Z/Ctrl+Y are handled on `document` and replace the inputs' native undo. Enter/↓ and Shift+Enter/↑ move to the same field on the next/previous day.

**Layout:** `.panel` is `width: fit-content; min-width: 100%` so `.shell` scrolls both axes once there are many columns; sticky left offsets are `calc(-1 * var(--gutter))` so the day column sticks flush to the window edge.

## Styling

Tailwind v4 with a custom `noxus` color palette defined in `tailwind.config.mjs`:
- `noxus-bg` `#0f1115`, `noxus-panel` `#151821`, `noxus-steel` `#2a2f3a`, `noxus-red` `#8b1d2c`, `noxus-ash` `#8b8f99`, `noxus-text` `#e6e6e6`

Bootstrap-like utility classes (`.card`, `.container`, `.col-*`) are defined as `@layer components` in `styles/styles.css`.
