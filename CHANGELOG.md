# Changelog

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
