# @bluebiz/mjgrid

Declarative CRUD grid for React. **One column definition drives everything**: the data grid, the filter bar, the create/edit dialog, inline editing, Excel import/export and print.

```
npm install @bluebiz/mjgrid
```

Headless core + a MUI adapter. The core (`@bluebiz/mjgrid/core`) has no UI dependency and can back any component library.

## Why a rewrite

This is a ground-up replacement for the `MjGrid` folder in the HACCP frontends. That implementation had three independent render engines (grid, inline, form) that each supported a different subset of column types, 11 React hooks called inside render callbacks, two different `pageSize`s in play at once, and writes that showed a success toast regardless of outcome. See `docs/LEGACY_BUGS.md` for the full audit.

Design rules enforced here (and by lint):

1. **One column-type registry.** Every type's capabilities live in `core/registry.ts`, once.
2. **Every cell is a real component.** `react-hooks/rules-of-hooks` is a build error.
3. **One source of truth for server state** via TanStack Query.
4. **No magic strings, hardcoded DOM ids or generated class hashes.**
5. **A write either succeeds or throws.** `assertOk` converts the backend's HTTP-200-with-error envelope into a real error.

## Quick start

```tsx
import { MjGrid } from '@bluebiz/mjgrid/mui'
import type { MjGridConfig } from '@bluebiz/mjgrid'

const products: MjGridConfig = {
  name: '제품',
  resource: '/api/products',
  editMode: 'dialog',
  softDelete: true,
  excelExport: true,
  columns: [
    { field: 'code', headerName: '품목코드', type: 'string', editable: true, rules: [{ required: true, minLength: 3 }],
      params: { valueCheckUrl: '/api/products/check/code/{value}/{code}' } },
    { field: 'name', headerName: '품목명', type: 'string', editable: true, showOnFilterBar: true },
    { field: 'unit', headerName: '사용단위', type: 'select', editable: true,
      params: { fetchUrl: '/api/product/unit', valueField: 'id', textField: 'name' } },
    { field: 'shelfLife', headerName: '소비기한', type: 'number', editable: true },
    { field: 'active', headerName: '사용여부', type: 'boolean', editable: true }
  ]
}

<MjGrid config={products} />
```

The host app provides transport once, at the root:

```tsx
import { MjProvider } from '@bluebiz/mjgrid/mui'

<MjProvider api={myAxiosAdapter}>   {/* implements MjApiClient */}
  <App />
</MjProvider>
```

The grid never sees tokens or base URLs - that is what makes it installable in any project.

## Server protocol

`POST {resource}/serverSide` with:

```json
{ "pageNum": 0, "pageSize": 12, "orderColumn": "seq", "orderSort": "asc",
  "filters": [{ "columnName": "name", "columnValue": "김치", "operator": "contains", "logic": "and" }],
  "exportExcel": false, "exportExcelExample": false,
  "gridSettings": { "columns": [{ "field": "code", "headerName": "품목코드" }] } }
```

Response: `{ "data": { "content": [...], "totalElements": 68 }, "status": 200 }`. Writes use `POST/PUT {resource}/bulk`, `PUT {resource}/{id}`, `DELETE {resource}/{id}`.

## Column types

`string` `number` `select` `date` `time` `timeRange` `weekDays` `boolean` `image` `file` `address` `button` `selectGrid` `autocomplete` `profile` `custom`

`params` is typed per `type` (discriminated union) - a `fetchUrl` on a `boolean` column is a compile error.

## Development

```
npm install
npm test          # vitest
npm run build     # tsup -> dist (esm + cjs + d.ts)
npm run lint
```
