import { Dialog, DialogContent, DialogTitle, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material'
import Box from '@mui/material/Box'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { capabilitiesOf, MjApiError, MjValidationError, useMj, useMjQuery, useMjRows, useMjSave, type MjColumn, type MjGridConfig, type MjRow } from '../core'
import './cells'
import './editors'
import './fields'
import './selectGrid'
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

const sortKey = (c: MjColumn) => c.sortField ?? (c.path ? `${c.field}.${c.path}` : c.field)

export function MjGrid({ config, title, actions, onSelect }: MjGridProps) {
  const { toast } = useMj()
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

  const table = useReactTable({ data: rows, columns: tableColumns, getCoreRowModel: getCoreRowModel(), manualPagination: true, manualSorting: true, manualFiltering: true, getRowId: r => r.id })

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
      if (config.hooks?.validate && !(await config.hooks.validate(edit.dirtyRows))) return
      const r = await saveBatch(edit.rows)
      const n = r.inserted.length + r.updated.length + r.deleted.length
      if (n === 0) { toast.error('변경된 내용이 없습니다.'); return }
      toast.success('저장 되었습니다.')
      edit.clearErrors()
    } catch (e) {
      if (e instanceof MjValidationError) { edit.setErrors(e.errors); toast.error(e.errors.map(x => `NO${x.rowIndex + 1}: ${x.message}`).join('\n')) }
      else if (e instanceof MjApiError) toast.error(e.message)
      else throw e
    }
  }, [config.hooks, edit, saveBatch, toast])

  const onDelete = useCallback(async () => {
    if (!selected) return
    const row = edit.rows.find(r => r.id === selected)
    if (!row) return
    if (row.__state === 'insert') { edit.removeRow(row.id); setSelected(null); return }
    const veto = await config.hooks?.onDeleteValidate?.(row)
    if (veto) { toast.error(veto); return }
    try { await deleteOne(row.id); toast.success('삭제 되었습니다.'); setSelected(null) }
    catch (e) { if (e instanceof MjApiError) toast.error(e.message); else throw e }
  }, [selected, edit, config.hooks, deleteOne, toast])

  const onExcelExport = async (example = false) => {
    const blob = await q.exportExcel(example)
    downloadBlob(blob, `${config.name}${example ? '_양식' : ''}_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`)
  }
  const onPrint = async () => openPrintWindow(buildPrintHtml(config, await q.fetchAll()))

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
                  const c = visibleColumns.find(x => x.field === h.column.id)!
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
              <TableRow><TableCell colSpan={visibleColumns.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>데이터가 없습니다.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <MjPagination page={q.page} pageCount={q.pageCount} total={q.total} pageSize={q.pageSize} onPageChange={q.setPage} />

      <Dialog open={dialog !== null} onClose={() => { setDialog(null); config.hooks?.onDialogClose?.() }} fullWidth maxWidth={config.dialogSize ?? 'sm'}>
        <DialogTitle align="center">{config.name} {dialog?.mode === 'insert' ? '등록' : dialog?.mode === 'view' ? '조회' : '수정'}</DialogTitle>
        <DialogContent>
          {dialog && <MjForm config={config} mode={dialog.mode} row={dialog.row} onClose={changed => { setDialog(null); config.hooks?.onDialogClose?.(); if (changed) void q.refresh() }} />}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

setGridComponent(MjGrid)
