import { Box, IconButton, LinearProgress, Skeleton, Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow, TableSortLabel } from '@mui/material'
import { flexRender, tableFeatures, useTable, type ColumnDef } from '@tanstack/react-table'
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
import { ExcelImportDialog } from './ExcelImport'
import { readCell } from './value'
import { MjCardFooter, MjCardList, MjMobileContext, MjSheet, MjSortControl, useMjMobile } from './mobile'
import { krds, srOnly } from './krds'

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
const canSort = (c: MjColumn) => c.sortable !== false && c.type !== 'button'
// paging, sorting and filtering are server-side (or in core/localQuery), so the table needs no feature beyond the core row model
const features = tableFeatures({})

ensureDefaults()

export const MjGrid = forwardRef<MjGridHandle, MjGridProps>(function MjGrid({ config, title, actions, onSelect }, ref) {
  const { toast, labels: L } = useMj()
  const mobile = useMjMobile(config)
  const cards = mobile.active && mobile.layout === 'cards'
  const q = useMjQuery(config)
  const edit = useMjRows(config.columns)
  const { saveBatch, deleteOne } = useMjSave(config)
  const mode = config.editMode ?? 'dialog'
  const inline = mode === 'inline'
  const [selected, setSelected] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ mode: MjFormMode; row?: Partial<MjRow> } | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  // mobile: the form's buttons live in the sheet's fixed footer, outside the scroll area
  const [formActionsEl, setFormActionsEl] = useState<HTMLDivElement | null>(null)

  // inline mode edits a client copy of the current page; reload it whenever the server rows change
  useEffect(() => { if (inline) edit.load(q.rows) }, [inline, q.rows, edit.load]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = inline ? edit.visibleRows : q.rows

  const visibleColumns = useMemo(() => config.columns.filter(c => !c.formOnly && !c.hide), [config.columns])
  const rowActions = inline && Boolean(config.rowActions)
  const hasFooter = visibleColumns.some(c => c.footerText !== undefined)

  // keepOneRow: an inline grid that must always offer an editable row
  useEffect(() => { if (inline && config.keepOneRow && edit.visibleRows.length === 0) edit.addRow() }, [inline, config.keepOneRow, edit.visibleRows.length, edit])

  const isEditing = useCallback((c: MjColumn) => inline && Boolean(c.editable) && Boolean(renderersFor(c).Editor) && capabilitiesOf(c).inlineCapable, [inline])
  const renderCell = useCallback((c: MjColumn, row: MjRow, value: unknown = readCell(c, row)): ReactNode => {
    const r = renderersFor(c)
    if (isEditing(c)) {
      const E = r.Editor!
      const err = edit.errorFor(row.id, c.field)?.message
      return <E column={c as never} row={row} value={value} error={err} onChange={(v, patch) => edit.setCell(row.id, c.field, v, patch)} />
    }
    if (c.renderCell) return <>{c.renderCell({ value, row, column: c }) as ReactNode}</>
    const C = r.Cell
    return <C column={c as never} row={row} value={value} />
  }, [isEditing, edit])

  const widthOf = (c: MjColumn) => c.width ?? capabilitiesOf(c).width
  const tableColumns = useMemo<ColumnDef<typeof features, MjRow, unknown>[]>(() => visibleColumns.map(c => ({
    id: c.field,
    header: c.headerName,
    accessorFn: (row: MjRow) => readCell(c, row),
    cell: ({ row, getValue }) => renderCell(c, row.original, getValue())
  })), [visibleColumns, renderCell])

  const actionColumn = useMemo<ColumnDef<typeof features, MjRow, unknown>[]>(() => rowActions ? [{
    id: '__actions', header: '+ / -',
    cell: ({ row }) => (
      <Box sx={{ display: 'flex', gap: '4px', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
        <IconButton size="small" aria-label={L.rowAdd} onClick={() => edit.addRow(undefined, edit.rows.findIndex(r => r.id === row.original.id) + 1)} sx={{ width: 40, height: 40, color: krds.color.iconGray, '&:focus-visible': { boxShadow: krds.focusRing } }}>＋</IconButton>
        <IconButton size="small" aria-label={L.rowRemove} onClick={() => edit.removeRow(row.original.id)} sx={{ width: 40, height: 40, color: krds.color.iconGray, '&:focus-visible': { boxShadow: krds.focusRing } }}>－</IconButton>
      </Box>
    )
  }] : [], [rowActions, edit, L])

  const allColumns = useMemo(() => [...tableColumns, ...actionColumn], [tableColumns, actionColumn])
  const table = useTable({ features, data: rows, columns: allColumns, getRowId: (r: MjRow) => r.id })

  const onHeaderSort = (c: MjColumn) => {
    if (!canSort(c)) return
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
  const closeDialog = () => { setDialog(null); config.hooks?.onDialogClose?.() }
  const rowsClickable = mode !== 'readonly' || Boolean(config.hooks?.onRowClick)

  return (
    <MjMobileContext.Provider value={mobile}>
    <Box className="mj-krds" sx={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: krds.font.family, color: krds.color.textBasic, '& :focus-visible': { outline: 'none', boxShadow: krds.focusRing } }} data-testid="mj-grid" data-mobile={mobile.active || undefined}>
      {!mobile.active && <MjFilterBar config={config} onSearch={q.setFilters} />}
      <MjToolbar config={config} search={q.search} onSearch={q.setSearch} onAdd={mode === 'readonly' && !config.hooks?.onAddClick ? undefined : onAdd} onSave={inline ? onSave : undefined} mobile={mobile.active}
        filterButton={mobile.active ? <MjFilterBar config={config} onSearch={q.setFilters} mobile={mobile} /> : undefined}
        onDelete={inline ? onDelete : undefined} canDelete={Boolean(selected)} onExcelExport={onExcelExport} onExcelImport={setImportFile} onPrint={onPrint} title={title} actions={actions} />
      {q.isFetching && <LinearProgress aria-label={L.loading} sx={{ bgcolor: krds.color.surfacePrimarySubtler, '& .MuiLinearProgress-bar': { bgcolor: krds.color.actionPrimaryActive } }} />}
      {q.error && <Box role="alert" sx={{ mx: '16px', mb: '8px', p: '12px 16px', borderRadius: krds.radius.md, bgcolor: krds.color.surfaceDangerSubtler, border: `${krds.borderW} solid ${krds.color.borderDanger}`, color: krds.color.textDanger, fontSize: krds.fs.bodyS }}><Box component="span" aria-hidden="true" sx={{ mr: '4px' }}>✕</Box>{q.error.message}</Box>}
      {cards && <MjSortControl columns={visibleColumns} sort={q.sort} onChange={q.setSort} sortKey={sortKey} />}
      {cards && (
        <MjCardList config={config} columns={visibleColumns} rows={rows} mobile={mobile} renderCell={renderCell} isEditing={isEditing}
          selected={selected} onRowClick={onRowClick} clickable={rowsClickable} loading={q.isLoading} emptyText={L.noData}
          rowActions={rowActions ? { addLabel: L.rowAdd, removeLabel: L.rowRemove, add: row => edit.addRow(undefined, edit.rows.findIndex(r => r.id === row.id) + 1), remove: row => edit.removeRow(row.id) } : undefined}
          footer={hasFooter ? <MjCardFooter columns={visibleColumns} rows={rows} /> : undefined} />
      )}
      {!cards && <TableContainer sx={{ flex: 1 }} role="region" aria-label={L.tableScrollHint} tabIndex={0}>
        <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontFamily: krds.font.family, fontSize: krds.fs.bodyS, color: krds.color.textBasic, borderBottom: `${krds.borderW} solid ${krds.color.borderGrayLight}`, px: '12px' } }}>
          <caption style={srOnly as React.CSSProperties}>{config.name}</caption>
          <TableHead>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => {
                  const c = visibleColumns.find(x => x.field === h.column.id)
                  const headSx = { bgcolor: `${krds.color.surfaceGraySubtler} !important`, fontWeight: 700, borderBottom: `${krds.borderW} solid ${krds.color.borderGray}`, whiteSpace: 'nowrap' }
                  if (!c) return <TableCell key={h.id} component="th" scope="col" style={{ width: 90, textAlign: 'center' }} sx={headSx}>{flexRender(h.column.columnDef.header, h.getContext())}</TableCell>
                  const active = q.sort.field === sortKey(c)
                  return (
                    <TableCell key={h.id} component="th" scope="col" style={{ width: widthOf(c), textAlign: capabilitiesOf(c).align }} sortDirection={active ? q.sort.direction : false} aria-sort={active ? (q.sort.direction === 'asc' ? 'ascending' : 'descending') : undefined} sx={headSx}>
                      {canSort(c)
                        ? <TableSortLabel active={active} direction={active ? q.sort.direction : 'asc'} onClick={() => onHeaderSort(c)} sx={{ color: `${krds.color.textBasic} !important`, '& .MuiTableSortLabel-icon': { color: `${krds.color.iconGray} !important` }, '&:focus-visible': { boxShadow: krds.focusRing, borderRadius: krds.radius.sm } }}>{flexRender(h.column.columnDef.header, h.getContext())}</TableSortLabel>
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {q.isLoading && rows.length === 0 && Array.from({ length: 5 }, (_, i) => (
              <TableRow key={`sk${i}`} aria-hidden="true"><TableCell colSpan={visibleColumns.length + (rowActions ? 1 : 0)} sx={{ py: '12px' }}><Skeleton variant="rounded" height={24} /></TableCell></TableRow>
            ))}
            {table.getRowModel().rows.map(r => (
              <TableRow key={r.id} hover selected={r.id === selected} onClick={() => onRowClick(r.original)} tabIndex={rowsClickable ? 0 : undefined}
                onKeyDown={e => { if (rowsClickable && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onRowClick(r.original) } }}
                sx={{ cursor: rowsClickable ? 'pointer' : 'default', height: config.rowHeight ?? krds.size.row,
                  '&:hover': { bgcolor: `${krds.color.actionPrimaryHover} !important` }, '&:active': { bgcolor: `${krds.color.actionPrimaryPressed} !important` },
                  '&.Mui-selected': { bgcolor: `${krds.color.actionPrimarySelected} !important`, boxShadow: `inset 3px 0 0 ${krds.color.borderPrimary}` },
                  '&:focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${krds.color.borderPrimary}` } }}>
                {r.getAllCells().map((cell, i) => (
                  <TableCell key={cell.id} component={i === 0 ? 'th' : 'td'} scope={i === 0 ? 'row' : undefined} sx={{ py: '4px', fontWeight: 400, whiteSpace: ['date', 'time', 'timeRange', 'number', 'status', 'boolean'].includes(visibleColumns.find(x => x.field === cell.column.id)?.type ?? '') ? 'nowrap' : undefined }}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && !q.isLoading && (
              <TableRow><TableCell colSpan={visibleColumns.length + (rowActions ? 1 : 0)} align="center" sx={{ py: 6, color: `${krds.color.textSubtle} !important`, fontSize: `${krds.fs.bodyM} !important` }}>{L.noData}</TableCell></TableRow>
            )}
          </TableBody>
          {hasFooter && (
            <TableFooter>
              <TableRow>
                {visibleColumns.map(c => (
                  <TableCell key={c.field} align={c.footerAlign ?? 'left'} sx={{ fontWeight: 700, bgcolor: krds.color.surfaceGraySubtler, color: `${krds.color.textBasic} !important` }}>
                    {typeof c.footerText === 'function' ? c.footerText(rows) : c.footerText ?? ''}
                  </TableCell>
                ))}
                {rowActions && <TableCell sx={{ bgcolor: krds.color.surfaceGraySubtler }} />}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>}
      <MjPagination page={q.page} pageCount={q.pageCount} total={q.total} pageSize={q.pageSize} onPageChange={q.setPage} mobile={mobile.active}
        pageSizeOptions={config.pageSizeOptions} onPageSizeChange={q.setPageSize} />

      {config.excelImport && <ExcelImportDialog config={config} file={importFile} onClose={() => setImportFile(null)} mobile={mobile} />}
      <MjSheet open={dialog !== null} onClose={closeDialog} size={config.dialogSize ?? 'sm'} mobile={mobile}
        title={<>{config.name} {dialog?.mode === 'insert' ? L.register : dialog?.mode === 'view' ? L.view : L.edit}</>}
        actions={mobile.active ? <Box ref={setFormActionsEl} sx={{ display: 'flex', gap: 1, '& .MuiButton-root': { flex: 1 } }} data-testid="mj-form-actions" /> : undefined}>
        {dialog && <MjForm config={config} mode={dialog.mode} row={dialog.row} onClose={closeDialog} mobile={mobile} actionsContainer={mobile.active ? formActionsEl : undefined} />}
      </MjSheet>
    </Box>
    </MjMobileContext.Provider>
  )
})

setGridComponent(MjGrid as never)
