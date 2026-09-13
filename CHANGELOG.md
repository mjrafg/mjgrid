# Changelog

## 1.3.0

- **MUI 5.12 → 9 and React 18 → 19 supported** (peers `@mui/material >=5.12 <10`, `react >=18 <20`). MUI 9 removed `inputProps` / `InputProps` / `InputLabelProps` / `FormHelperTextProps` / `SelectProps` / `PaperProps` and changed `Grid`; MUI 5 lacks `slotProps`. `compat.ts` (`tfSlots`, `drawerPaper`, `muiMajor`) spells the props for the installed version; the form layout is a plain CSS grid.
- Development now runs on MUI 9.4 / React 19; `npm run test:matrix` (and CI) re-runs typecheck + tests on MUI 5.12.2 / React 18.2.0.

## 1.2.1

- Fix: `dayjs/plugin/customParseFormat` imported with its `.js` extension — 1.2.0 failed to load under Node's native ESM loader (Next.js SSR).

## 1.2.0

- **Label-driven date picker** (`MjDatePicker`, `MjCalendar`) replaces the native `<input type="date">` in the form, the inline editor and the filter bar. The calendar's month names, weekday abbreviations, header (`2026년 9월`), display formats and buttons come from `labels` (Korean default, `enLabels` in English), so every browser and OS shows the same thing. Typed input in the display format, `selector: 'date' | 'month' | 'year'`, 오늘 / 지우기, popover on desktop, bottom sheet (with back-button dismiss) on mobile.
- Grid publishes its resolved mobile state through `MjMobileContext`; `useMjMobile()` without a config inherits it.

## 1.1.2

- Mobile toolbar: the ⋮ menu button sits outside the wrapping button row, so it never takes a line of its own.

## 1.1.1

- Mobile form: the 취소/삭제/등록 buttons render in the sheet's fixed footer (portal + `form` attribute) instead of a sticky row inside the scroll area, which overlapped the last field on real phones.

## 1.1.0

Mobile support.

- `config.mobile` / `MjProvider mobile` options: `enabled` ('auto' below `breakpoint` 768px), `layout` ('cards' | 'table'), `cardFields`, `sheet` ('sheet' | 'full'), `history`.
- Rows render as cards on phones (title + fields + "더보기", button columns in the card footer, inline editors inside cards with +/− actions); a sort control replaces header sorting.
- Every overlay (create/edit/view form, delete confirm, Excel preview, selectGrid picker, filters) is a bottom sheet (`MjSheet`) on mobile and a Dialog on desktop.
- **Browser back closes the open sheet** (`useHistoryDismiss`): one tagged history entry per overlay, nested overlays close innermost-first, UI closes leave no phantom entries, pushes wait for pending backs.
- Toolbar: full-width search with `enterKeyHint`, primary actions 44px, secondary actions behind ⋮; filter bar becomes a badge button opening a sheet (applies on 적용, never while typing).
- Compact pager with safe-area padding; 16px inputs (no iOS zoom); responsive signature canvas with pointer scaling.
- Columns: `hideOnMobile`, `mobileRole: 'title' | 'always'`.

## 1.0.1

- Package renamed `@bluebiz/mjgrid` → `@agent24/mjgrid` (all entry points: `.`, `./core`, `./mui`). No API changes.

## 1.0.0

Ground-up replacement for the `MjGrid` folder of the HACCP frontends (legacy audit: 43 defects across three render engines).

- Headless core (types, protocol, validation, registry, Excel, local query) + MUI adapter.
- All 16 column types on every surface they support; `selectGrid` picker in the dialog form (legacy dropped it).
- Dialog / inline / readonly modes; row actions; sequence field; keepOneRow; view mode; custom `onSave`.
- Files: drag-and-drop uploader, signature pad, profile avatar; uploads deferred to submit.
- Excel import with editable preview and validation; server or client-side export; HTML-escaped print.
- Client-side mode with local filtering/sorting; imperative `MjGridHandle`.
- i18n labels (ko/en), configurable file endpoints, injected transport (`MjApiClient`).
- 116 tests; native ESM/CJS smoke test in `prepublishOnly`; GitHub Actions CI runs the full gate.
