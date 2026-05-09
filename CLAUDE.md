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
  └── dateUtils.js     — pure date helpers (pad2, dateKey, daysInMonth, weekdayShort, isWeekend, monthTitle)
```

**State shape (`appState`):**
```js
{
  year: number,
  month0: number,           // 0-based month
  columns: [{ id, title, soll }],
  cells: { "YYYY-MM-DD": { colId: { code, hours } } },
  comments: { "YYYY-MM-DD": string, "_soll"|"_ist"|"_nbs"|"_tage": string }
}
```

Cell keys use the format `"YYYY-MM-DD"` (from `dateUtils.dateKey`). Input `data-*` attributes encode lookups as `"YYYY-MM-DD|colId"`.

**N→X auto-fill logic:** `effectiveCode(dk, colId)` in `state.js` — if a cell has no stored code and the previous day's stored code is `"N"`, it returns `"X"` as a visual placeholder (not persisted).

**Calendar modal:** `calendarModal.js` renders a 7-column grid for one column's month. The `⊞` button in each column header triggers it via `data-calview="<colId>"`. Closing works by the ✕ button, clicking the backdrop, or printing via the browser print dialog (CSS hides everything except the modal during print).

**Known issues (TODOs in code):**
- `state.js:effectiveCode` duplicates `pad2`/`dateKey` logic instead of importing from `dateUtils.js` — silent breakage risk if date format changes
- Tab navigation is broken after a re-render: `_pendingFocus` is only set via `mousedown`, not `Tab` key (`events.js`)

## Styling

Tailwind v4 with a custom `noxus` color palette defined in `tailwind.config.mjs`:
- `noxus-bg` `#0f1115`, `noxus-panel` `#151821`, `noxus-steel` `#2a2f3a`, `noxus-red` `#8b1d2c`, `noxus-ash` `#8b8f99`, `noxus-text` `#e6e6e6`

Bootstrap-like utility classes (`.card`, `.container`, `.col-*`) are defined as `@layer components` in `styles/styles.css`.
