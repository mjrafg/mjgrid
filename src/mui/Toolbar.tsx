import { Box, IconButton, InputAdornment, Menu, MenuItem } from '@mui/material'
import { useId, useState, type ReactNode } from 'react'
import { useMj, type MjGridConfig } from '../core'
import { touchSx } from './mobile'
import { krds, KrdsTextField, MjButton } from './krds'

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

/**
 * KRDS action hierarchy (components/buttons.md): one dominant Primary per
 * context — the create action, or 저장 in inline mode. Everything else is
 * secondary / tertiary; 삭제 uses the Danger semantic.
 */
export function MjToolbar(p: MjToolbarProps) {
  const { config } = p
  const { labels: L } = useMj()
  const [term, setTerm] = useState(p.search)
  const { busy, run } = useBusy()
  const inline = config.editMode === 'inline'
  // React-unique, so two grids with the same name on one page cannot collide
  const fileInputId = `mj-excel-${useId()}`
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const size = p.mobile ? 'medium' : 'small'

  const search = config.showToolbarSearch && (
    <KrdsTextField size={size} value={term} placeholder={L.searchPlaceholder} onChange={e => setTerm(e.target.value)} fullWidth={p.mobile} aria-label={L.search}
      onKeyDown={e => { if (e.key === 'Enter') p.onSearch(term) }} inputMode="search" inputProps={p.mobile ? { enterKeyHint: 'search' } : undefined} sx={p.mobile ? undefined : { width: 280 }}
      startAdornment={<InputAdornment position="start"><IconButton size="small" aria-label={L.clear} onClick={() => { setTerm(''); p.onSearch('') }} sx={{ color: krds.color.iconGray }}>✕</IconButton></InputAdornment>}
      endAdornment={<InputAdornment position="end"><IconButton size="small" aria-label={L.search} onClick={() => p.onSearch(term)} sx={{ color: krds.color.iconGray }}>🔍</IconButton></InputAdornment>} />
  )
  const excelInput = config.excelImport && <input id={fileInputId} type="file" accept=".xlsx" hidden onChange={e => { const f = e.target.files?.[0]; if (f) p.onExcelImport?.(f); e.target.value = '' }} />
  const addButton = (config.addable ?? true) && p.onAdd && <MjButton variant={inline ? 'secondary' : 'primary'} size={size} onClick={p.onAdd}>{config.addButtonText ?? L.addTitle(config.name)}</MjButton>
  const saveButton = inline && <MjButton variant="primary" size={size} disabled={busy === 'save'} onClick={run('save', p.onSave)}>{L.save}</MjButton>
  const deleteButton = inline && (config.deletable ?? true) && <MjButton variant="danger" size={size} disabled={busy === 'delete' || !p.canDelete} onClick={run('delete', p.onDelete)}>{L.delete}</MjButton>

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
      <Box sx={{ display: config.hideToolbar ? 'none' : 'flex', flexDirection: 'column', gap: '8px', p: '12px', ...touchSx }} data-testid="mj-toolbar-mobile">
        {p.title && <Box sx={{ fontFamily: krds.font.family, fontSize: krds.fs.h4, fontWeight: 700 }}>{p.title}</Box>}
        {search && <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>{search}{p.filterButton}</Box>}
        {/* the ⋮ button is outside the wrapping row so it never drops onto a line of its own */}
        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', '& > .MuiButton-root': { flex: '1 1 auto', whiteSpace: 'nowrap' } }}>
            {!search && p.filterButton}
            {p.actions}
            {addButton}{saveButton}{deleteButton}
          </Box>
          {menu.length > 0 && (
            <>
              <IconButton aria-label={L.menu} aria-haspopup="menu" onClick={e => setMenuAnchor(e.currentTarget)} sx={{ flex: '0 0 auto', color: krds.color.iconGray, border: `${krds.borderW} solid ${krds.color.buttonTertiaryBorder}`, borderRadius: krds.radius.md, width: 48, height: 48 }}>⋮</IconButton>
              <Menu open={menuAnchor !== null} anchorEl={menuAnchor} onClose={() => setMenuAnchor(null)} className="mj-krds" sx={{ '& .MuiMenu-paper': { boxShadow: krds.shadow[2], borderRadius: krds.radius.lg, border: `${krds.borderW} solid ${krds.color.borderGrayLight}` } }}>
                {menu.map(m => <MenuItem key={m.key} disabled={m.disabled} onClick={() => { setMenuAnchor(null); m.onClick() }} sx={{ minHeight: krds.size.touch, fontFamily: krds.font.family, fontSize: krds.fs.bodyM, '&:hover': { bgcolor: krds.color.actionPrimaryHover } }}>{m.label}</MenuItem>)}
              </Menu>
            </>
          )}
        </Box>
        {excelInput}
      </Box>
    )
  }

  return (
    <Box sx={{ display: config.hideToolbar ? 'none' : 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', p: '16px' }}>
      <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {search}
        {p.title && <Box sx={{ fontFamily: krds.font.family, fontSize: krds.fs.h4, fontWeight: 700, color: krds.color.textBasic }}>{p.title}</Box>}
      </Box>
      <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {p.actions}
        {config.excelImport && (
          <>
            <MjButton variant="tertiary" size={size} disabled={busy === 'example'} onClick={run('example', () => p.onExcelExport?.(true) ?? Promise.resolve())}>{L.excelTemplate}</MjButton>
            <MjButton variant="tertiary" size={size} component="label" htmlFor={fileInputId}>{L.excelImport}</MjButton>
            {excelInput}
          </>
        )}
        {config.excelExport && <MjButton variant="tertiary" size={size} disabled={busy === 'export'} onClick={run('export', () => p.onExcelExport?.() ?? Promise.resolve())}>{L.excelExport}</MjButton>}
        {config.printable && <MjButton variant="tertiary" size={size} disabled={busy === 'print'} onClick={run('print', p.onPrint)}>{L.print}</MjButton>}
        {addButton}
        {saveButton}
        {deleteButton}
      </Box>
    </Box>
  )
}
