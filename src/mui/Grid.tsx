import { Box, Dialog, DialogContent, DialogTitle, IconButton, LinearProgress, Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow, TableSortLabel } from '@mui/material'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState, type ReactNode } from 'react'
import { capabilitiesOf, MjApiError, MjValidationError, useMj, useMjQuery, useMjRows, useMjSave, type MjColumn, type MjFilter, type MjGridConfig, type MjRow } from '../core'
import { ensureDefaults } from './bootstrap'
import { MjFilterBar } from './FilterBar'
import { MjForm, type MjFormMode } from './Form'
import { MjPagination } from './Pagination'
import { buildPrintHtml, downloadBlob, openPrintWindow } from './print'
import { renderersFor, setGridComponent } from './registry'
import { MjToolbar } from './Toolbar'
import { readCell } from './value'

export interface MjGridProps {
  config: MjGridConfig
  title?: ReactNode
  actions?: ReactNode
  /** row selected by click in inline mode */
  onSelect?: (row: MjRow | null) => void
}

/** Imperative API (legacy: gridRef.current.refresh() etc.). */
export interface MjGridHandle {
  refresh: () => Promise<void>
  setFilters: (filters: MjFilter[]) => void
  setSearch: (term: string) => void
  getRows: () => MjRow[]
  getDirtyRows: () => MjRow[]
  fetchAll: () => Promise<MjRow[]>
  addRow: (defaults?: Record<string, unknown>, index?: number) => MjRow | undefined
  removeRow: (rowId: string) => void
  getSelected: () => MjRow | null
  clearSelection: () => void
  save: () => Promise<void>
  openInsert: (defaults?: Record<string, unknown>) => void
  openEdit: (row: MjRow) => void
  openView: (row: MjRow) => void
}

const sortKey = (c: MjColumn) => c.sortField ?? (c.path ? `${c.field}.${c.path}` : c.field)

ensureDefaults()

export const MjGrid = forwardRef<MjGridHandle, MjGridProps>(function MjGrid({ config, title, actions, onSelect }, ref) {
  const { toast, labels: L } = useMj()
  const q = useMjQuery(config)
  const edit = useMjRows(config.columns)
  const { saveBatch, deleteOne } = useMjSave(config)
  const mode = config.editMode ?? 'dialog'
  const inline = mode === 'inline'
  const [selected, setSelected] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ mode: MjFormMode; row?: Partial<MjRow> } | null>(null)

  // inline mode edits a client copy of the current page; reload it whenever the server rows change
  useEffect(() => { if (inline) edit.load(q.rows) }, [inline, q.rows, edit.load]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = inline ? edit.visibleRows : q.rows

  const visibleColumns = useMemo(() => config.columns.filter(c => !c.formOnly && !c.hide), [config.columns])
  const rowActions = inline && Boolean(config.rowActions)
  const hasFooter = visibleColumns.some(c => c.footerText !== undefined)

  // keepOneRow: an inline grid that must always offer an editable row
  useEffect(() => { if (inline && config.keepOneRow && edit.visibleRows.length === 0) edit.addRow() }, [inline, config.keepOneRow, edit.visibleRows.length, edit])

  const tableColumns = useMemo<ColumnDef<MjRow>[]>(() => visibleColumns.map(c => ({
    id: c.field,
    header: c.headerName,
    size: c.width ?? capabilitiesOf(c).width,
    enableSorting: c.sortable !== false && c.type !== 'button',
    accessorFn: row => readCell(c, row),
    cell: ({ row, getValue }) => {
      const r = renderersFor(c)
      const value = getValue()
      if (inline && c.editable && r.Editor && capabilitiesOf(c).inlineCapable) {
        const E = r.Editor
        const err = edit.errorFor(row.original.id, c.field)?.message
        return <E column={c as never} row={row.original} value={value} error={err} onChange={(v, patch) => edit.setCell(row.original.id, c.field, v, patch)} />
      }
      const C = r.Cell
      return <C column={c as never} row={row.original} value={value} />
    }
  })), [visibleColumns, inline, edit])

  const actionColumn = useMemo<ColumnDef<MjRow>[]>(() => rowActions ? [{
    id: '__actions', header: '+ / -', size: 90, enableSorting: false,
    cell: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
        <IconButton size="small" aria-label={L.rowAdd} onClick={() => edit.addRow(undefined, edit.rows.findIndex(r => r.id === row.original.id) + 1)}>＋</IconButton>
        <IconButton size="small" aria-label={L.rowRemove} onClick={() => edit.removeRow(row.original.id)}>－</IconButton>
      </Box>
    )
  }] : [], [rowActions, edit, L])

  const table = useReactTable({ data: rows, columns: [...tableColumns, ...actionColumn], getCoreRowModel: getCoreRowModel(), manualPagination: true, manualSorting: true, manualFiltering: true, getRowId: r => r.id })

  const onHeaderSort = (c: MjColumn) => {
    if (c.sortable === false || c.type === 'button') return
    const key = sortKey(c)
    q.setSort(q.sort.field === key ? { field: key, direction: q.sort.direction === 'asc' ? 'desc' : 'asc' } : { field: key, direction: 'asc' })
  }

  const onRowClick = (row: MjRow) => {
    if (config.hooks?.onRowClick) { config.hooks.onRowClick(row); return }
    if (inline) { const id = row.id === selected ? null : row.id; setSelected(id); onSelect?.(id ? row : null); return }
    if (mode === 'dialog') setDialog({ mode: 'update', row })
  }

  const onAdd = () => {
    config.hooks?.onAddClick?.()
    if (inline) edit.addRow(undefined, 0)
    else if (mode === 'dialog') {
      const row: Partial<MjRow> = {}
      for (const c of config.columns) if (c.defaultValue !== undefined) row[c.field] = c.defaultValue
      setDialog({ mode: 'insert', row })
    }
  }

  const onSave = useCallback(async () => {
    try {
      // sequenceField: the visible order is data; rows whose position changed become dirty
      let rowsToSave = edit.rows
      if (config.sequenceField) {
        const seqKey = config.sequenceField
        let i = 0
        rowsToSave = edit.rows.map(r => {
          if (r.__state === 'delete') return r
          const seq = i++
          if (r[seqKey] === seq) return r
          return { ...r, [seqKey]: seq, __state: r.__state === 'insert' ? 'insert' : 'update' }
        })
      }
      const dirty = rowsToSave.filter(r => r.__state && r.__state !== 'none')
      if (config.hooks?.validate && !(await config.hooks.validate(dirty))) return
      if (config.hooks?.onSave) {
        if (dirty.length === 0) { toast.error(L.noChanges); return }
        await config.hooks.onSave(dirty, rowsToSave)
        toast.success(L.saved); edit.clearErrors(); config.hooks.afterSave?.(rowsToSave); return
      }
      const r = await saveBatch(rowsToSave)
      const n = r.inserted.length + r.updated.length + r.deleted.length
      if (n === 0) { toast.error(L.noChanges); return }
      toast.success(L.saved)
      edit.clearErrors()
      config.hooks?.afterSave?.(rowsToSave)
    } catch (e) {
      if (e instanceof MjValidationError) { edit.setErrors(e.errors); toast.error(e.errors.map(x => `${L.errorPrefix(x.rowIndex + 1)}${x.message}`).join('\n')) }
      else if (e instanceof MjApiError) toast.error(e.message)
      else throw e
    }
  }, [config.hooks, config.sequenceField, edit, saveBatch, toast, L])

  const onDelete = useCallback(async () => {
    if (!selected) return
    const row = edit.rows.find(r => r.id === selected)
    if (!row) return
    if (row.__state === 'insert') { edit.removeRow(row.id); setSelected(null); return }
    const veto = await config.hooks?.onDeleteValidate?.(row)
    if (veto) { toast.error(veto); return }
    try { await deleteOne(row.id); toast.success(L.deleted); setSelected(null) }
    catch (e) { if (e instanceof MjApiError) toast.error(e.message); else throw e }
  }, [selected, edit, config.hooks, deleteOne, toast, L])

  useImperativeHandle(ref, () => ({
    refresh: async () => { await q.refresh() },
    setFilters: q.setFilters,
    setSearch: q.setSearch,
    getRows: () => (inline ? edit.rows : q.rows),
    getDirtyRows: () => edit.dirtyRows,
    fetchAll: q.fetchAll,
    addRow: (defaults, index) => (inline ? edit.addRow(defaults, index) : undefined),
    removeRow: edit.removeRow,
    getSelected: () => edit.rows.find(r => r.id === selected) ?? q.rows.find(r => r.id === selected) ?? null,
    clearSelection: () => setSelected(null),
    save: onSave,
    openInsert: defaults => setDialog({ mode: 'insert', row: defaults }),
    openEdit: row => setDialog({ mode: 'update', row }),
    openView: row => setDialog({ mode: 'view', row })
  }), [q, edit, inline, selected, onSave])

  const onExcelExport = async (example = false) => {
    const blob = await q.exportExcel(example)
    downloadBlob(blob, `${config.name}${example ? '_양식' : ''}_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`)
  }
  const onPrint = async () => openPrintWindow(buildPrintHtml(config, await q.fetchAll(), L))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }} data-testid="mj-grid">
      <MjFilterBar config={config} onSearch={q.setFilters} />
      <MjToolbar config={config} search={q.search} onSearch={q.setSearch} onAdd={onAdd} onSave={inline ? onSave : undefined}
        onDelete={inline ? onDelete : undefined} canDelete={Boolean(selected)} onExcelExport={onExcelExport} onPrint={onPrint} title={title} actions={actions} />
      {q.isFetching && <LinearProgress />}
      {q.error && <Box sx={{ color: 'error.main', px: 2 }} role="alert">{q.error.message}</Box>}
      <TableContainer sx={{ flex: 1 }}>
        <Table stickyHeader size="small">
          <TableHead>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => {
                  const c = visibleColumns.find(x => x.field === h.column.id)
                  if (!c) return <TableCell key={h.id} style={{ width: h.getSize(), textAlign: 'center' }}>{flexRender(h.column.columnDef.header, h.getContext())}</TableCell>
                  const active = q.sort.field === sortKey(c)
                  return (
                    <TableCell key={h.id} style={{ width: h.getSize(), textAlign: capabilitiesOf(c).align }} sortDirection={active ? q.sort.direction : false}>
                      {h.column.getCanSort()
                        ? <TableSortLabel active={active} direction={active ? q.sort.direction : 'asc'} onClick={() => onHeaderSort(c)}>{flexRender(h.column.columnDef.header, h.getContext())}</TableSortLabel>
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map(r => (
              <TableRow key={r.id} hover selected={r.id === selected} onClick={() => onRowClick(r.original)}
                sx={{ cursor: mode === 'readonly' && !config.hooks?.onRowClick ? 'default' : 'pointer', height: config.rowHeight ?? 40 }}>
                {r.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} sx={{ py: 0.5 }}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && !q.isLoading && (
              <TableRow><TableCell colSpan={visibleColumns.length + (rowActions ? 1 : 0)} align="center" sx={{ py: 6, color: 'text.secondary' }}>{L.noData}</TableCell></TableRow>
            )}
          </TableBody>
          {hasFooter && (
            <TableFooter>
              <TableRow>
                {visibleColumns.map(c => (
                  <TableCell key={c.field} align={c.footerAlign ?? 'left'} sx={{ fontWeight: 600 }}>
                    {typeof c.footerText === 'function' ? c.footerText(rows) : c.footerText ?? ''}
                  </TableCell>
                ))}
                {rowActions && <TableCell />}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
      <MjPagination page={q.page} pageCount={q.pageCount} total={q.total} pageSize={q.pageSize} onPageChange={q.setPage} />

      <Dialog open={dialog !== null} onClose={() => { setDialog(null); config.hooks?.onDialogClose?.() }} fullWidth maxWidth={config.dialogSize ?? 'sm'}>
        <DialogTitle align="center">{config.name} {dialog?.mode === 'insert' ? L.register : dialog?.mode === 'view' ? L.view : L.edit}</DialogTitle>
        <DialogContent>
          {dialog && <MjForm config={config} mode={dialog.mode} row={dialog.row} onClose={changed => { setDialog(null); config.hooks?.onDialogClose?.(); if (changed) void q.refresh() }} />}
        </DialogContent>
      </Dialog>
    </Box>
  )
})

setGridComponent(MjGrid)
