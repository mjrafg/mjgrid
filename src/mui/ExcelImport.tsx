import { Box, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { assertOk, loadOptionsByField, mjQueryKey, mjUrls, MjApiError, MjValidationError, newRowId, parseExcelRows, readFileAsArrayBuffer, useMj, validateRows, type MjGridConfig, type MjRow } from '../core'
import { getGridComponent } from './registry'
import type { MjGridHandle } from './Grid'
import { MjSheet, type MjMobileState } from './mobile'
import { krds, MjButton } from './krds'

export interface ExcelImportDialogProps {
  config: MjGridConfig
  file: File | null
  onClose: (imported: boolean) => void
  mobile: MjMobileState
}

/**
 * Parse -> preview in an editable inline grid -> validate -> POST {resource}/bulk.
 * The preview is a real MjGrid (client-side rows), so fixes before import use
 * the same editors and validation as everywhere else.
 */
export function ExcelImportDialog({ config, file, onClose, mobile }: ExcelImportDialogProps) {
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
    hooks: {},
    // the preview inherits the host's mobile layout; force the sheet full-height so the card list gets room
    mobile: { ...config.mobile, enabled: mobile.active, history: false }
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
    <MjSheet open={file !== null} onClose={() => onClose(false)} size="lg" mobile={mobile} data-testid="mj-excel-import"
      title={<>{L.excelPreviewTitle(config.name)}{rows ? ` — ${L.excelRowsFound(rows.length)}` : ''}</>}
      actions={
        <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', '& .MuiButton-root': mobile.active ? { flex: 1 } : undefined }}>
          <MjButton variant="tertiary" size={mobile.active ? 'large' : 'medium'} onClick={() => onClose(false)}>{L.cancel}</MjButton>
          <MjButton variant="primary" size={mobile.active ? 'large' : 'medium'} onClick={submit} disabled={!rows || busy}>{L.register}</MjButton>
        </Box>
      }>
      {error && <Typography role="alert" sx={{ p: '12px 16px', borderRadius: krds.radius.md, bgcolor: krds.color.surfaceDangerSubtler, border: `${krds.borderW} solid ${krds.color.borderDanger}`, color: krds.color.textDanger }}><Box component="span" aria-hidden="true" sx={{ mr: '4px' }}>✕</Box>{error}</Typography>}
      {rows && <Box sx={{ height: mobile.active ? '70dvh' : '60vh', minHeight: 300 }}><Grid ref={gridRef} config={previewConfig} /></Box>}
    </MjSheet>
  )
}
