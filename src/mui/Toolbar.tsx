import { Button, IconButton, InputAdornment, TextField } from '@mui/material'
import Box from '@mui/material/Box'
import { useState, type ReactNode } from 'react'
import type { MjGridConfig } from '../core'

export interface MjToolbarProps {
  config: MjGridConfig
  search: string
  onSearch: (term: string) => void
  onAdd?: () => void
  onSave?: () => Promise<void>
  onDelete?: () => Promise<void>
  onExcelExport?: (example?: boolean) => Promise<void>
  onExcelImport?: (file: File) => void
  onPrint?: () => Promise<void>
  canDelete?: boolean
  title?: ReactNode
  actions?: ReactNode
}

function useBusy() {
  const [busy, setBusy] = useState<string | null>(null)
  const run = (key: string, fn?: () => Promise<void>) => async () => {
    if (!fn) return
    setBusy(key)
    try { await fn() } finally { setBusy(null) }
  }
  return { busy, run }
}

export function MjToolbar(p: MjToolbarProps) {
  const { config } = p
  const [term, setTerm] = useState(p.search)
  const { busy, run } = useBusy()
  const inline = config.editMode === 'inline'
  const fileInputId = `mj-excel-${config.name}`.replace(/\s+/g, '-')

  return (
    <Box sx={{ display: config.hideToolbar ? 'none' : 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {config.showToolbarSearch && (
          <TextField size="small" value={term} placeholder="검색어 입력.." onChange={e => setTerm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') p.onSearch(term) }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><IconButton size="small" aria-label="초기화" onClick={() => { setTerm(''); p.onSearch('') }}>✕</IconButton></InputAdornment>,
              endAdornment: <InputAdornment position="end"><IconButton size="small" aria-label="검색" onClick={() => p.onSearch(term)}>🔍</IconButton></InputAdornment>
            }} />
        )}
        {p.title}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {p.actions}
        {config.excelImport && (
          <>
            <Button variant="outlined" disabled={busy === 'example'} onClick={run('example', () => p.onExcelExport?.(true) ?? Promise.resolve())}>양식다운로드</Button>
            <Button variant="outlined" component="label" htmlFor={fileInputId}>엑셀업로드</Button>
            <input id={fileInputId} type="file" accept=".xlsx" hidden onChange={e => { const f = e.target.files?.[0]; if (f) p.onExcelImport?.(f); e.target.value = '' }} />
          </>
        )}
        {config.excelExport && <Button variant="outlined" disabled={busy === 'export'} onClick={run('export', () => p.onExcelExport?.() ?? Promise.resolve())}>엑셀다운로드</Button>}
        {config.printable && <Button variant="contained" color="success" disabled={busy === 'print'} onClick={run('print', p.onPrint)}>인쇄</Button>}
        {(config.addable ?? true) && p.onAdd && <Button variant="contained" onClick={p.onAdd}>{config.addButtonText ?? `${config.name}등록`}</Button>}
        {inline && (
          <>
            <Button variant="contained" color="success" disabled={busy === 'save'} onClick={run('save', p.onSave)}>저장</Button>
            {(config.deletable ?? true) && <Button variant="contained" color="error" disabled={busy === 'delete' || !p.canDelete} onClick={run('delete', p.onDelete)}>삭제</Button>}
          </>
        )}
      </Box>
    </Box>
  )
}
