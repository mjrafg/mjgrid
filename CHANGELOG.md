# Changelog

## 1.5.0

**KRDS design system** (HACCAP `docs/design-system`, Korean government design system, Standard style) applied to every surface.

- `krds` tokens: every colour / radius / border width / shadow / font / size is a `--krds-*` CSS variable with the official light-mode fallback; `<KrdsTokens />` ships the token sheet (semantic tokens, `html.high-contrast` thicker borders + darker grays, `html.font-size-1..5` via a `--krds-scale` multiplier); `createKrdsTheme()` for MUI.
- `MjButton` (primary / secondary / tertiary / text / danger; 32 / 40 / 48 / 56) and `KrdsTextField` (label above the field with a red required marker, 40 / 48 / 56, gray-60 border, primary-50 focus at 2px, danger-50 error at 2px with icon, `for` / `aria-describedby` / `aria-invalid` / `aria-required`).
- Table per components/tables.md: gray-5 header (body-small 700, gray-30 bottom border), 48px rows with gray-20 borders, hover primary-5, selected row primary-5 + 3px primary start border, `<caption>`, `scope="col"` / `scope="row"`, `aria-sort`, skeleton rows while loading, inline error alert, horizontal-scroll region with a hint.
- `MjBadge` and a new **`status` column type** (icon + text + semantic colour, never colour alone; success / warning / danger / information / gray). Boolean cells render as badges (positive success, negative gray). Legacy `button` colours map to KRDS variants.
- Action hierarchy: one Primary per context (create, or 저장 in inline mode); Excel / print tertiary; delete = Danger; form bar `[tertiary Cancel] [Danger delete] [Primary submit]`, large on mobile.
- Forms: error summary above the form (`role="alert"`) + inline errors + focus moved to the first invalid field; `config.inputSize: 'large'` for operator forms.
- Filters: active filters shown as removable chips; result count is a live region.
- Pagination: page-size selector 10 / 20 / 50 (`config.pageSizeOptions`), Primary interaction colours, 44px targets, `aria-current`.
- Overlays: modal / sheet radius 12, shadow-3, backdrop rgba(0,0,0,.75); popover / menu shadow-2. Mobile cards: 1px gray-20 border, radius 10, 20px padding, fields as a `dl`.
- 4px focus ring (`--krds-box-shadow-outline`) on every interactive element; Pretendard GOV font stack.

## 1.4.1

- Filter bar (desktop): date presets and the search button are 40px like the small inputs beside them; select filters back to their natural width (full width only in the mobile sheet).

## 1.4.0

- **TanStack Table v9** (`useTable` + `tableFeatures({})`, own column sizing/sortability; paging, sorting and filtering stay server-side / in `core/localQuery`). No API change for consumers.
- `zod` dependency removed (it was declared but never used).
- Toolchain: ESLint 10 (flat config), typescript-eslint 8.70, Vitest 5 / Vite 8, jsdom 30, tsup 8.5, jest-dom 7, msw 2.15; TypeScript stays on 5.9 (typescript-eslint and tsup do not support TS 7 yet). Development and CI run on **Node 24** (`engines.node >= 20.19` for `require(esm)`, needed by jsdom 30 / Vite 8; consumers only need what their bundler needs).

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
