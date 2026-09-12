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

## Development

```
npm install
sh scripts/gate.sh        # typecheck, lint, tests, build, native-ESM smoke test
npm run build
cd examples/demo && npm install && npm run dev   # http://localhost:5180
```
