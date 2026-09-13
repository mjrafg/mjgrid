import { Box, Button, IconButton, InputAdornment, Menu, MenuItem, TextField } from '@mui/material'
import { useId, useState, type ReactNode } from 'react'
import { useMj, type MjGridConfig } from '../core'
import { touchSx } from './mobile'

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
  /** compact layout: full-width search, primary buttons, the rest in a ⋮ menu */
  mobile?: boolean
  /** mobile: opens the filter sheet; rendered next to the search box */
  filterButton?: ReactNode
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
  const { labels: L } = useMj()
  const [term, setTerm] = useState(p.search)
  const { busy, run } = useBusy()
  const inline = config.editMode === 'inline'
  // React-unique, so two grids with the same name on one page cannot collide
  const fileInputId = `mj-excel-${useId()}`
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  const search = config.showToolbarSearch && (
    <TextField size="small" value={term} placeholder={L.searchPlaceholder} onChange={e => setTerm(e.target.value)} fullWidth={p.mobile}
      onKeyDown={e => { if (e.key === 'Enter') p.onSearch(term) }} inputProps={p.mobile ? { enterKeyHint: 'search', inputMode: 'search' } : undefined}
      InputProps={{
        startAdornment: <InputAdornment position="start"><IconButton size="small" aria-label={L.clear} onClick={() => { setTerm(''); p.onSearch('') }}>✕</IconButton></InputAdornment>,
        endAdornment: <InputAdornment position="end"><IconButton size="small" aria-label={L.search} onClick={() => p.onSearch(term)}>🔍</IconButton></InputAdornment>
      }} />
  )
  const excelInput = config.excelImport && <input id={fileInputId} type="file" accept=".xlsx" hidden onChange={e => { const f = e.target.files?.[0]; if (f) p.onExcelImport?.(f); e.target.value = '' }} />
  const addButton = (config.addable ?? true) && p.onAdd && <Button variant="contained" onClick={p.onAdd}>{config.addButtonText ?? L.addTitle(config.name)}</Button>
  const saveButton = inline && <Button variant="contained" color="success" disabled={busy === 'save'} onClick={run('save', p.onSave)}>{L.save}</Button>
  const deleteButton = inline && (config.deletable ?? true) && <Button variant="contained" color="error" disabled={busy === 'delete' || !p.canDelete} onClick={run('delete', p.onDelete)}>{L.delete}</Button>

  if (p.mobile) {
    // secondary actions go behind one ⋮ button so the primary ones keep 44px targets on a 360px screen
    const menu: { key: string; label: string; onClick: () => void; disabled?: boolean }[] = []
    if (config.excelImport) {
      menu.push({ key: 'example', label: L.excelTemplate, onClick: run('example', () => p.onExcelExport?.(true) ?? Promise.resolve()), disabled: busy === 'example' })
      menu.push({ key: 'import', label: L.excelImport, onClick: () => document.getElementById(fileInputId)?.click() })
    }
    if (config.excelExport) menu.push({ key: 'export', label: L.excelExport, onClick: run('export', () => p.onExcelExport?.() ?? Promise.resolve()), disabled: busy === 'export' })
    if (config.printable) menu.push({ key: 'print', label: L.print, onClick: run('print', p.onPrint), disabled: busy === 'print' })
    return (
      <Box sx={{ display: config.hideToolbar ? 'none' : 'flex', flexDirection: 'column', gap: 1, p: 1.5, ...touchSx }} data-testid="mj-toolbar-mobile">
        {p.title && <Box>{p.title}</Box>}
        {search && <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>{search}{p.filterButton}</Box>}
        {/* the ⋮ button is outside the wrapping row so it never drops onto a line of its own */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', '& > .MuiButton-root': { flex: '1 1 auto', whiteSpace: 'nowrap' } }}>
            {!search && p.filterButton}
            {p.actions}
            {addButton}{saveButton}{deleteButton}
          </Box>
          {menu.length > 0 && (
            <>
              <IconButton aria-label={L.menu} aria-haspopup="menu" onClick={e => setMenuAnchor(e.currentTarget)} sx={{ flex: '0 0 auto' }}>⋮</IconButton>
              <Menu open={menuAnchor !== null} anchorEl={menuAnchor} onClose={() => setMenuAnchor(null)}>
                {menu.map(m => <MenuItem key={m.key} disabled={m.disabled} onClick={() => { setMenuAnchor(null); m.onClick() }} sx={{ minHeight: 44 }}>{m.label}</MenuItem>)}
              </Menu>
            </>
          )}
        </Box>
        {excelInput}
      </Box>
    )
  }

  return (
    <Box sx={{ display: config.hideToolbar ? 'none' : 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {search}
        {p.title}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {p.actions}
        {config.excelImport && (
          <>
            <Button variant="outlined" disabled={busy === 'example'} onClick={run('example', () => p.onExcelExport?.(true) ?? Promise.resolve())}>{L.excelTemplate}</Button>
            <Button variant="outlined" component="label" htmlFor={fileInputId}>{L.excelImport}</Button>
            {excelInput}
          </>
        )}
        {config.excelExport && <Button variant="outlined" disabled={busy === 'export'} onClick={run('export', () => p.onExcelExport?.() ?? Promise.resolve())}>{L.excelExport}</Button>}
        {config.printable && <Button variant="contained" color="success" disabled={busy === 'print'} onClick={run('print', p.onPrint)}>{L.print}</Button>}
        {addButton}
        {saveButton}
        {deleteButton}
      </Box>
    </Box>
  )
}
