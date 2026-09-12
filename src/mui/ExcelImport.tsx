import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { assertOk, loadOptionsByField, mjQueryKey, mjUrls, MjApiError, MjValidationError, newRowId, parseExcelRows, readFileAsArrayBuffer, useMj, validateRows, type MjGridConfig, type MjRow } from '../core'
import { getGridComponent } from './registry'
import type { MjGridHandle } from './Grid'

export interface ExcelImportDialogProps {
  config: MjGridConfig
  file: File | null
  onClose: (imported: boolean) => void
}

/**
 * Parse -> preview in an editable inline grid -> validate -> POST {resource}/bulk.
 * The preview is a real MjGrid (client-side rows), so fixes before import use
 * the same editors and validation as everywhere else.
 */
export function ExcelImportDialog({ config, file, onClose }: ExcelImportDialogProps) {
  const { api, labels: L, toast } = useMj()
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<MjRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const gridRef = useRef<MjGridHandle>(null)
  const Grid = getGridComponent()

  useEffect(() => {
    if (!file) { setRows(null); setError(null); return }
    let cancelled = false
    ;(async () => {
      try {
        const buf = await readFileAsArrayBuffer(file)
        const optionsByField = await loadOptionsByField(api, queryClient, config.columns)
        const parsed = parseExcelRows(buf, config.columns, { optionsByField, positiveText: L.positive, negativeText: L.negative })
        if (!cancelled) setRows(parsed.map(r => ({ ...r, id: newRowId(), __state: 'insert' as const })))
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) }
    })()
    return () => { cancelled = true }
  }, [file, api, queryClient, config.columns, L.positive, L.negative])

  const previewConfig: MjGridConfig = {
    ...config, resource: undefined, urls: undefined, rows: rows ?? [], editMode: 'inline', rowActions: true, excelExport: false, excelImport: false, printable: false,
    addable: false, hideToolbar: true, showToolbarSearch: false, pageSize: Math.max(rows?.length ?? 0, 1), defaultFilters: undefined, extraFilterBarColumns: undefined,
    columns: config.columns.filter(c => !c.hideOnExcel && c.type !== 'button').map(c => ({ ...c, showOnFilterBar: false })),
    hooks: {}
  }

  const submit = async () => {
    const current = (gridRef.current?.getRows() ?? []).filter(r => r.__state !== 'delete')
    if (current.length === 0) { toast.error(L.noChanges); return }
    setBusy(true)
    try {
      const errors = await validateRows(current.map(r => ({ ...r, __state: 'insert' as const })), previewConfig.columns)
      if (errors.length) throw new MjValidationError(errors)
      const url = mjUrls.insertBulk(config)
      const payload = current.map(({ __state: _s, id: _id, ...rest }) => rest)
      assertOk(await api.post(url, { rows: payload }), url)
      await queryClient.invalidateQueries({ queryKey: mjQueryKey(config) })
      toast.success(L.inserted)
      onClose(true)
    } catch (e) {
      if (e instanceof MjValidationError) toast.error(e.errors.map(x => `${L.errorPrefix(x.rowIndex + 1)}${x.message}`).join('\n'))
      else if (e instanceof MjApiError) toast.error(e.message)
      else throw e
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={file !== null} onClose={() => onClose(false)} fullWidth maxWidth="lg">
      <DialogTitle>{L.excelPreviewTitle(config.name)}{rows ? ` — ${L.excelRowsFound(rows.length)}` : ''}</DialogTitle>
      <DialogContent sx={{ minHeight: 300 }}>
        {error && <Typography color="error" role="alert">{error}</Typography>}
        {rows && <Box sx={{ height: '60vh' }}><Grid ref={gridRef} config={previewConfig} /></Box>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} color="error" variant="contained">{L.cancel}</Button>
        <Button onClick={submit} variant="contained" disabled={!rows || busy}>{L.register}</Button>
      </DialogActions>
    </Dialog>
  )
}
