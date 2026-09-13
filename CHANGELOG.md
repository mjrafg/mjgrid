# Changelog

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
