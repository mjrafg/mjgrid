# @bluebiz/mjgrid

Declarative CRUD grid for React. **One column definition drives everything**: the data grid, the filter bar, the create/edit/view dialog, inline editing, Excel import/export and print.

```
npm install @bluebiz/mjgrid     # npm projects
yarn add @bluebiz/mjgrid        # yarn projects
```

Use the package manager the host project already uses (mixing them makes the other tool reconcile `node_modules` and drop packages). Until it is published, install from a tarball: `npm pack` in this repo, then `yarn add file:./bluebiz-mjgrid-<version>.tgz` — and bump the version for every local tarball you install, because yarn v1 reinstalls a cached tarball of the same version.

Peer dependencies: `react >=18`, `react-dom >=18`; the MUI adapter needs `@mui/material >=5.12`, `@emotion/react`, `@emotion/styled`.

## 30-second start

```tsx
import { MjGrid, MjProvider } from '@bluebiz/mjgrid'
import type { MjApiClient, MjGridConfig } from '@bluebiz/mjgrid'

// 1. Transport is yours: implement MjApiClient over your axios/fetch, auth and base URL.
const api: MjApiClient = { get, post, put, delete: del, downloadPost, upload }

// 2. Describe the grid once.
const products: MjGridConfig = {
  name: '제품',
  resource: '/api/products',
  editMode: 'dialog',            // 'dialog' | 'inline' | 'readonly'
  softDelete: true,
  excelExport: true, excelImport: true, printable: true, showToolbarSearch: true,
  columns: [
    { field: 'code', headerName: '품목코드', type: 'string', editable: true, rules: [{ required: true, minLength: 3 }],
      params: { valueCheckUrl: '/api/products/check/code/{value}/{code}' } },
    { field: 'name', headerName: '품목명', type: 'string', editable: true, showOnFilterBar: true, rules: [{ required: true }] },
    { field: 'unit', headerName: '단위', type: 'select', editable: true, path: 'name',
      params: { fetchUrl: '/api/product/unit', valueField: 'id', textField: 'name' } },
    { field: 'shelfLife', headerName: '소비기한', type: 'number', editable: true },
    { field: 'active', headerName: '사용여부', type: 'boolean', editable: true, defaultValue: true }
  ]
}

// 3. Render.
<MjProvider api={api} toast={{ success: toast.success, error: toast.error }}>
  <MjGrid config={products} />
</MjProvider>
```

`examples/demo` is a complete Vite app running against an in-memory `MjApiClient` — every feature below is exercised there.

## MjProvider

| prop | purpose |
|---|---|
| `api` | your `MjApiClient` (required). The grid never sees tokens or base URLs. |
| `toast` | `{ success, error }` sink for notifications (default: console.error only). |
| `labels` | partial `MjLabels` override. `koLabels` (default) and `enLabels` are exported. |
| `messages` | validation messages (`koMessages` default, `enMessages`). |
| `files` | `{ uploadUrl, downloadUrl(file), imageUrl(path) }` — defaults match the HACCP backend. |
| `queryClient` | share your app's TanStack QueryClient (one is created otherwise). |

### MjApiClient

```ts
interface MjApiClient {
  get<T>(url, headers?): Promise<MjEnvelope<T>>
  post<T>(url, body, headers?): Promise<MjEnvelope<T>>
  put<T>(url, body?, headers?): Promise<MjEnvelope<T>>
  delete<T>(url, headers?): Promise<MjEnvelope<T>>
  downloadPost(url, body, headers?): Promise<Blob>     // Excel export
  upload<T>(url, form: FormData): Promise<MjEnvelope<T>> // multipart
}
interface MjEnvelope<T> { data?: T; status: number; error?: string; message?: string }
```

An envelope with `status !== 200` **or** a non-empty `error` is treated as a failure everywhere (`assertOk` throws `MjApiError`), so a backend that answers `200 { error: "…" }` can never produce a success toast.

## Server protocol

| operation | request |
|---|---|
| list | `POST {resource}/serverSide` — header `softDelete: "true"\|"false"`, body below |
| create | `POST {resource}` (one row) / `POST {resource}/bulk` `{ rows }` |
| update | `PUT {resource}/{id}` / `PUT {resource}/bulk` `{ rows }` |
| delete | `DELETE {resource}/{id}` — header `softDelete` |
| Excel | same list request with `exportExcel: true` (or `exportExcelExample: true`) via `downloadPost` |
| options | `GET params.fetchUrl` → array, mapped with `valueField` / `textField` |
| duplicate check | `GET params.valueCheckUrl` with `{value}` = new value and `{field}` = original value; truthy `data` = taken |
| upload | multipart `file`, `type`, `dateBase`, `isDraw` |

```json
{ "pageNum": 0, "pageSize": 12, "orderColumn": "seq", "orderSort": "asc",
  "filters": [{ "columnName": "name", "columnValue": "김치", "operator": "contains", "logic": "and" }],
  "exportExcel": false, "exportExcelExample": false,
  "gridSettings": { "columns": [{ "field": "code", "headerName": "품목코드", "width": 120 }] } }
→ { "data": { "content": [...], "totalElements": 68 }, "status": 200 }
```

Override any URL with `config.urls.{fetch,insert,insertBulk,update,updateBulk,delete}`. Without `resource` (and with `rows`) the grid is **client-side**: search, filters, sort and paging run locally with the same operator semantics.

## MjGridConfig

| key | type | notes |
|---|---|---|
| `name` | string | shown in titles and toasts |
| `columns` | `MjColumn[]` | see below |
| `resource` / `urls` / `rows` | | server root, overrides, or static rows |
| `editMode` | `'dialog' \| 'inline' \| 'readonly'` | default `dialog` |
| `softDelete` | boolean | sent as header on list and delete |
| `pageSize`, `defaultSort`, `defaultFilters` | | `defaultFilters` are merged into every request unless overridden |
| `extraFilters` | `MjFilter[] \| (term) => MjFilter[]` | added to the free-text search |
| `extraFilterBarColumns`, `extraFormColumns` | `MjColumn[]` | |
| `excelExport`, `excelImport`, `printable`, `addable`, `deletable`, `showToolbarSearch`, `hideToolbar` | boolean | |
| `addButtonText`, `dialogSize`, `rowHeight` | | |
| `rowActions` | boolean | inline: + / − per row |
| `sequenceField` | string | inline: visible order written into this field on save |
| `keepOneRow` | boolean | inline: always keep an editable row |
| `printColor` | string \| (row) => string | |
| `hooks` | `MjGridHooks` | see below |

### hooks

`onRowClick`, `onAddClick`, `onDialogClose`, `onInserted(row)`, `onDataInserted/Updated/Deleted(rows, previous)`, `onBeforeSave(rows, previous)`, `onBeforeSaveSingle(row)`, `onDeleteValidate(row) → message|null`, `onFilterChange(filters)`, `afterFetch(rows, total)`, `validate(dirty) → boolean`, `onSave(dirty, all)` (replaces the REST batch in inline mode), `afterSave(rows)`, `onSubmit(previous, next)` (replaces the dialog save).

## Columns

```ts
{ field, headerName, type, params?, width?, editable?, filterable?, sortable?, hide?,
  rules?, defaultValue?, formOnly?, showOnFilterBar?, filterBarIndex?, hideOnExcel?, hideOnView?, hideOnPrint?,
  path?, parentPath?, sortField?, span?, formIndex?, footerText?, footerAlign?, excelExampleValue?,
  printFormat?, printColor?, getFilters?, filterDefaultValue?, onFilterChange?, renderCell? }
```

`params` is typed per `type` (discriminated union) — a `fetchUrl` on a `boolean` column is a compile error.

| type | stored as | form | inline | params |
|---|---|---|---|---|
| `string` | string | ✓ | ✓ | `inputType: 'password'`, `multiline`, `rows`, `placeholder`, `mask` ('000-0000'), `valueCheckUrl`, `valueCheck(fn)`, `valueCheckText`, `mainPasswordField`, `format`, `disabled`, `editable` |
| `number` | number | ✓ | ✓ | `mask`, `unitField` |
| `select` | value or `{[valueField]: …}` | ✓ | ✓ | `options` **or** `fetchUrl` + `valueField` + `textField`; `placeholder`, `hideAllOption`, `onChange` |
| `date` | `YYYY-MM-DD` | ✓ | ✓ | `format`, `selector: 'date'\|'month'\|'year'`, `ranges` (filter presets) |
| `time` | `HH:mm:ss` | ✓ | ✓ | `step` (minutes) |
| `timeRange` | `"HH:mm HH:mm"` | ✓ | | |
| `weekDays` | `"1,0,1,0,1,0,0"` Sunday-first | ✓ | | `dayLabels` |
| `boolean` | boolean | ✓ | ✓ | `positiveText`, `negativeText`, `colorPositive`, `onClick` |
| `image` | `MjFile` | ✓ | | `signFeature` (stamp/signature tabs), `squareImage`, `storageType`, `maxSize`, `accept`, `onChange` |
| `file` | `MjFile` | ✓ | | `storageType`, `dateBase`, `maxSize`, `accept` |
| `profile` | text; photo in `params.profileField` | ✓ | | `profileField`, `profileRequired` |
| `address` | string | ✓ | | Daum postcode when `window.daum` is present |
| `button` | — | | | `text`, `color`, `variant`, `visible`, `icon`, `onClick(value,row)` (all may be functions of the row) |
| `selectGrid` | picked row object | ✓ | ✓ | `grid: MjGridConfig` (picker), `patch(picked) → sibling fields`, `displayValue`, `dialogTitle`, `onChange` |
| `autocomplete` | option data | ✓ | | `options`/`fetchUrl`, `textFormatter`, `onChange` |
| `custom` | any | ✓ | | `node` or `node(ctx)` |

Read-only cells exist for every type. Files are **staged** when chosen and uploaded when the form is submitted, so cancelling a form never leaves orphan files.

### rules

`required`, `min`, `max`, `minEqual`, `maxEqual`, `minLength`, `maxLength`, `email`, `password`, `passwordRepeat`, `mask`, `duplicate: false` (unique within a batch), `message` (override), `validate(row) → message`.

## Imperative API

```tsx
const ref = useRef<MjGridHandle>(null)
<MjGrid ref={ref} config={cfg} />
ref.current.refresh() · setFilters(f) · setSearch(term) · getRows() · getDirtyRows() · fetchAll()
ref.current.addRow(defaults?, index?) · removeRow(id) · getSelected() · clearSelection() · save()
ref.current.openInsert(defaults?) · openEdit(row) · openView(row)
```

## Headless core

`@bluebiz/mjgrid/core` has no UI dependency: types, `buildServerSideRequest`, `validateField/validateRows`, `filterFor`, `parseExcelRows` / `buildTemplateWorkbook` / `exportRowsToXlsx`, `applyFilters/applySort`, and the hooks `useMjQuery`, `useMjRows`, `useMjSave`, `useMjOptions`, `useMjUpload`. Another UI adapter registers renderers with `registerType(type, { Cell, Editor, Field })`.

## Design rules (enforced)

1. One column-type registry; capabilities in `core/registry.ts`, renderers merged in any order.
2. Every cell is a component — `react-hooks/rules-of-hooks` is a build error.
3. One source of truth for server state (TanStack Query): one `pageSize`, one fetch per state change, shared option cache.
4. No magic strings, hardcoded DOM ids or generated class hashes.
5. A write either succeeds or throws. Print output is HTML-escaped.
6. `scripts/check-esm.mjs` loads every built entry under Node's native ESM/CJS loaders before publish.

## Architecture

```
src/
├── core/                 headless — no UI dependency (published as @bluebiz/mjgrid/core)
│   ├── types.ts          MjColumn discriminated union (16 types), MjGridConfig, MjGridHooks, MjRule
│   ├── protocol.ts       MjApiClient, MjEnvelope, buildServerSideRequest, assertOk / MjApiError
│   ├── url.ts            mjUrls(config) → fetch/insert/update/delete URLs (MjUrlError on misuse)
│   ├── registry.ts       column-type capabilities + value codecs (parse/format/filter operator)
│   ├── validation.ts     validateField / validateRows, applyMask, fillUrlTemplate
│   ├── localQuery.ts     client-side mode: applyFilters / applySort / pageOf
│   ├── excel.ts          parseExcelRows, buildTemplateWorkbook, exportRowsToXlsx (SheetJS)
│   ├── labels.ts         koLabels / enLabels          messages.ts  koMessages / enMessages
│   └── react/            MjProvider · useMjQuery · useMjRows · useMjSave · useMjOptions · useMjUpload
└── mui/                  MUI 5 adapter (published as @bluebiz/mjgrid/mui and re-exported from the root)
    ├── Grid.tsx          <MjGrid> — TanStack Table + toolbar, filter bar, pagination, footer, dialogs
    ├── Form.tsx          create / edit / view dialog (react-hook-form), deferred file uploads
    ├── FilterBar.tsx  Toolbar.tsx  Pagination.tsx  ExcelImport.tsx  print.ts
    ├── cells.tsx  editors.tsx  fields.tsx  fields2.tsx  files.tsx  selectGrid.tsx
    └── registry.tsx      registerType / renderersFor — Cell, Editor (inline), Field (form) per type
```

**Data flow.** `MjGrid` derives a `ServerSideRequest` from `{ page, sort, search, filters, defaultFilters }`, hands it to `useMjQuery` (TanStack Query key = resource + request), and renders the rows with TanStack Table. Inline edits live in `useMjRows` (dirty tracking, row actions, sequence field) and are flushed by `useMjSave` as `insertBulk` / `updateBulk` / per-row delete. The dialog form validates with `validateRows` against the same `rules`, uploads staged files, then posts one row. Select options are loaded once per `fetchUrl` through the shared query cache, so ten select columns pointing at the same endpoint cost one request.

**Extending.** `registerType('myType', { Cell, Editor, Field })` adds or overrides renderers for a type; registration is merge-based, so the built-in renderers (`ensureDefaults()`) and yours can load in any order. The core codecs decide how a value is parsed, formatted, filtered and exported — add one there if the new type stores data differently.

## Migrating from the legacy `MjGrid` (`src/@core/mjGrid`)

The API was redesigned rather than ported. The mapping below covers every legacy prop that appears in the HACCP pages.

### Grid props → `MjGridConfig`

| legacy (`MjGridProps`) | new |
|---|---|
| `mainUrl` | `resource` |
| `fetchUrl` / `insertUrl` / `insertBulkUrl` / `updateUrl` / `deleteUrl` | `urls.{fetch,insert,insertBulk,update,delete}` |
| `type: 'serverSide' \| 'clientSide'` | inferred: `resource` ⇒ server, `rows` ⇒ client |
| `updateMode: 'extend'` | `editMode: 'dialog'` (default) |
| `updateMode: 'inline'` | `editMode: 'inline'` |
| `updateMode: 'none'` | `editMode: 'readonly'` |
| `modalSize` / `updateDialogMaxWidth` | `dialogSize` |
| `extraUpdateColumns` | `extraFormColumns` |
| `afterFetchedData` | `hooks.afterFetch` |
| `onSubmit`, `onInserted`, `onAddClick`, `onBeforeSave`, `onBeforeSaveSingle`, `onDataInserted/Updated/Deleted`, `onDeleteValidate`, `onFilterChange`, `validate` | same names under `hooks` |
| `onRowUpdateDialogClose` | `hooks.onDialogClose` |
| `customizePrintColor` | `printColor` |
| `hasRowAction` / `hasSequence` / `rowDefaultData` (edit grid) | `rowActions` / `sequenceField` / `hooks.onAddClick` defaults via `addRow(defaults)` |
| `customValidate` / `beforeSave` / `onSave` / `afterSave` (edit grid) | `hooks.validate` / `hooks.onBeforeSave` / `hooks.onSave` / `hooks.afterSave` |
| `title`, `actionElements`, `addButtonIcon`, `mode` | dropped — compose around `<MjGrid>` |

`name`, `columns`, `rows`, `pageSize`, `softDelete`, `excelExport`, `excelImport`, `extraFilters`, `extraFilterBarColumns`, `addable`, `deletable`, `defaultFilters`, `defaultSort`, `hideToolbar`, `addButtonText`, `showToolbarSearch`, `printable` keep their names.

### Column types

| legacy `columnType` | new `type` | notes |
|---|---|---|
| `MjString` | `string` | `placeHolder` → `placeholder`; `type: 'password'` → `inputType: 'password'` |
| `MjNumber` | `number` | `unit` → `unitField`; thousands separator is always on |
| `MjSelect` | `select` | `onSelectValueChange` → `onChange`; `columnProp` → `path` |
| `MjSelectGrid` | `selectGrid` | `gridSettings` → `grid`; `getDisplayValue` → `displayValue`; `getModalTitle` → `dialogTitle`; `onSelectGridValueChanged` → `patch` |
| `MjAutoComplete` | `autocomplete` | |
| `MjDateOnly` | `date` | |
| `MjDateTime` | `date` | legacy stored dates as strings anyway; add `format: 'YYYY-MM-DD HH:mm'` for display |
| `MjTime` / `MjTimeRange` / `MjWeekDaySelect` | `time` / `timeRange` / `weekDays` | |
| `MjBoolean` | `boolean` | `colorChange` → `colorPositive`; `onBooleanClick` → `onClick` |
| `MjImage` / `MjFile` / `MjProfile` | `image` / `file` / `profile` | `onImageChange` → `onChange`; uploads are deferred to submit |
| `MjAddress` | `address` | |
| `MjButton` | `button` | `onButtonClick` → `onClick` |
| `MjCustom` | `custom` | `customNode` → `node` |
| `MjEmpty` | — | use `formOnly: true` on a column, or omit the column |

### Column props

`justUpdate` → `formOnly`, `columnProp` → `path`, `columnParentProp` → `parentPath`, `customizePrintData` → `printFormat`, `customizePrintColor` → `printColor`, `updateViewIndex` → `formIndex`, `controllerSpacePercent` → `span` (1–12), `getFilterProps` → `getFilters`, `filterValueChange` → `onFilterChange`, `customRenderCell` → `renderCell`, `hideNativeFilter` → `filterable: false`. Rules keep their names; `validate(row)` returns a message or `undefined`.

### Refs

`MjGridRefProps.refresh/setFilters/getRows/getRowsNoPaging` → `MjGridHandle.refresh/setFilters/getRows/fetchAll`; `addUnsavedRows` → `addRow`; `MjGridEditRefProps.validate/getRows/addEmptyRow` → `getDirtyRows` / `getRows` / `addRow`; `setRows`, `setTitle`, `setLoading`, `setColumns` are gone — change the `config` prop instead.

### Transport

The legacy grid imported `apiService` and read the token itself. The new grid receives an `MjApiClient`; the HACCP admin front's adapter is `src/mjgrid/api.ts` (≈25 lines over the existing `apiService` / `axiosInstance`). Server contract, header names and the `{ data, status, error }` envelope are unchanged, so no backend change is required.

## Development

```
npm install
sh scripts/gate.sh        # typecheck, lint, tests, build, native-ESM smoke test
npm run build
cd examples/demo && npm install && npm run dev   # http://localhost:5180
```

`scripts/gate.sh` is what CI runs (`.github/workflows/ci.yml`): every step reports its own exit code, so a red test can never hide behind a green build.

### Tests

`test/core` covers the protocol, URL resolution, validation, registry codecs, Excel parsing/export and local queries with no DOM; `test/mui` renders the grid, form, filter bar, inline editor, Excel import and toolbar with `@testing-library/react` against a fake `MjApiClient`. 116 tests, ~10 s.

### Releasing

1. Update `CHANGELOG.md` and bump `version` in `package.json`.
2. `npm publish` — `prepublishOnly` runs typecheck, tests, build and the native ESM/CJS smoke test.
3. `git tag v<version> && git push --tags`.

## License

MIT — see [LICENSE](LICENSE).
