import { Badge, Box, Chip, IconButton, MenuItem } from '@mui/material'
import { useState } from 'react'
import dayjs from 'dayjs'
import { filterFor, useMj, useMjOptions, type MjColumn, type MjDateRange, type MjFilter, type MjGridConfig } from '../core'
import { MjSheet, type MjMobileState } from './mobile'
import { MjDatePicker } from './DatePicker'
import { krds, KrdsTextField, MjButton } from './krds'

export interface MjFilterBarProps {
  config: MjGridConfig
  onSearch: (filters: MjFilter[]) => void
  /** mobile: renders a badge button that opens the controls in a sheet; place it next to the search box */
  mobile?: MjMobileState
}

function SelectFilter({ column, value, onChange, fullWidth }: { column: Extract<MjColumn, { type: 'select' | 'status' }>; value: string; onChange: (v: string) => void; fullWidth?: boolean }) {
  const { options: fetched } = useMjOptions(column.type === 'select' ? column.params : undefined)
  const { labels } = useMj()
  const options = column.type === 'status' ? (column.params?.options ?? []).map(o => ({ value: o.value, text: o.text })) : fetched
  return (
    <KrdsTextField select size="small" label={column.headerName} value={value} sx={{ minWidth: 160 }} fullWidth={fullWidth} displayEmpty onChange={e => onChange(String(e.target.value))}>
      {!(column.type === 'select' && column.params?.hideAllOption) && <MenuItem value=""><em>{labels.all}</em></MenuItem>}
      {options.map(o => <MenuItem key={String(o.value)} value={String(o.value)}>{o.text}</MenuItem>)}
    </KrdsTextField>
  )
}

/**
 * Filter row built from columns marked showOnFilterBar (+ extraFilterBarColumns).
 * No magic "all" sentinel: empty string means no filter.
 * Select/boolean/date changes apply immediately; text applies on Enter or the search button.
 * Nothing fires on mount (the legacy bar issued an extra request via an effect on first render).
 */
export function MjFilterBar({ config, onSearch, mobile }: MjFilterBarProps) {
  const { labels } = useMj()
  const columns = [...(config.extraFilterBarColumns ?? []).map(c => ({ ...c, showOnFilterBar: true })), ...config.columns]
    .filter(c => c.showOnFilterBar)
    .sort((a, b) => (a.filterBarIndex ?? 1) - (b.filterBarIndex ?? 1))
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [open, setOpen] = useState(false)
  // values applied to the query (drive the active-filter chips); `values` is the draft being edited
  const [applied, setApplied] = useState<Record<string, unknown>>({})
  const isMobile = Boolean(mobile?.active)
  if (columns.length === 0) return null

  const apply = (next: Record<string, unknown>) => {
    const filters: MjFilter[] = []
    for (const c of columns) {
      const v = next[c.field]
      if (v === undefined || v === null || v === '') continue
      if (c.getFilters) { filters.push(...c.getFilters(String(v))); continue }
      let fv: unknown = v
      if (c.type === 'boolean') fv = v === 'true'
      if (c.type === 'date') {
        const r = v as { startDate?: string; endDate?: string }
        if (!r.startDate || !r.endDate) continue
        // dayjs parses 'YYYY-MM-DD' as local midnight; new Date() would use UTC and shift a day in negative offsets
        fv = { startDate: dayjs(r.startDate).toDate(), endDate: dayjs(r.endDate).toDate() }
      }
      const f = filterFor(c, fv)
      if (f) filters.push(f)
    }
    setApplied(next)
    onSearch(filters)
  }
  const set = (c: MjColumn, v: unknown, immediate: boolean) => {
    const next = { ...values, [c.field]: v }
    setValues(next)
    c.onFilterChange?.(v)
    // on mobile everything applies from the sheet's button, never while typing behind the keyboard
    if (immediate && !isMobile) apply(next)
  }
  const activeCount = columns.filter(c => { const v = values[c.field]; return v !== undefined && v !== null && v !== '' && !(typeof v === 'object' && !(v as { startDate?: string }).startDate && !(v as { endDate?: string }).endDate) }).length
  const clearAll = () => { setValues({}); setApplied({}); onSearch([]) }
  const removeOne = (field: string) => { const next = { ...values }; delete next[field]; setValues(next); apply(next) }
  const describe = (c: MjColumn, v: unknown): string => {
    if (c.type === 'boolean') return v === 'true' ? c.params?.positiveText ?? labels.positive : c.params?.negativeText ?? labels.negative
    if (c.type === 'date') { const r = v as { startDate?: string; endDate?: string }; return `${r.startDate ?? ''} ~ ${r.endDate ?? ''}` }
    if (c.type === 'status') return c.params?.options.find(o => String(o.value) === String(v))?.text ?? String(v)
    return String(v)
  }
  const activeChips = columns.filter(c => { const v = applied[c.field]; return v !== undefined && v !== null && v !== '' && !(typeof v === 'object' && !(v as { startDate?: string }).startDate) })

  const controls = (
    <Box sx={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', px: isMobile ? 0 : '16px', pt: isMobile ? 0 : '16px', flexDirection: isMobile ? 'column' : 'row', fontFamily: krds.font.family, '& > *': isMobile ? { width: '100%' } : undefined }} data-testid="mj-filter-controls">
      {columns.map(c => {
        const v = values[c.field]
        switch (c.type) {
          case 'select':
          case 'status':
            return <SelectFilter key={c.field} column={c} value={String(v ?? '')} onChange={x => set(c, x, true)} fullWidth={isMobile} />
          case 'boolean':
            return (
              <KrdsTextField key={c.field} select size="small" label={c.headerName} value={String(v ?? '')} sx={{ minWidth: 140 }} fullWidth={isMobile} displayEmpty onChange={e => set(c, String(e.target.value), true)}>
                <MenuItem value=""><em>{labels.all}</em></MenuItem>
                <MenuItem value="true">{c.params?.positiveText ?? labels.positive}</MenuItem>
                <MenuItem value="false">{c.params?.negativeText ?? labels.negative}</MenuItem>
              </KrdsTextField>
            )
          case 'date': {
            const r = (v as { startDate?: string; endDate?: string } | undefined) ?? {}
            // state keeps the raw 'YYYY-MM-DD' strings; apply() converts. Applies immediately whenever both ends are set or the range is cleared.
            const setRange = (nr: { startDate?: string; endDate?: string }) => set(c, nr, Boolean((nr.startDate && nr.endDate) || (!nr.startDate && !nr.endDate)))
            const upd = (k: 'startDate' | 'endDate', s: string) => setRange({ ...r, [k]: s || undefined })
            const presets: MjDateRange[] = c.params?.ranges ?? [
              { name: labels.today, startDate: () => new Date(), endDate: () => new Date() },
              { name: labels.week, startDate: () => dayjs().subtract(1, 'week').toDate(), endDate: () => new Date() },
              { name: labels.month, startDate: () => dayjs().subtract(1, 'month').toDate(), endDate: () => new Date() }
            ]
            const fmt = (d: Date) => dayjs(d).format('YYYY-MM-DD')
            const active = (p: MjDateRange) => r.startDate === fmt(p.startDate()) && r.endDate === fmt(p.endDate())
            return (
              <Box key={c.field} sx={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', '& > *': isMobile ? { width: '100%' } : undefined }}>
                <Box sx={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <MjDatePicker size="small" label={c.headerName} selector={c.params?.selector ?? 'date'} value={r.startDate ?? null} onChange={v => upd('startDate', v ?? '')} sx={isMobile ? { flex: 1 } : { width: 170 }} />
                  <Box component="span" aria-hidden="true" sx={{ pb: '10px' }}>~</Box>
                  <MjDatePicker size="small" aria-label={`${c.headerName} end`} selector={c.params?.selector ?? 'date'} value={r.endDate ?? null} onChange={v => upd('endDate', v ?? '')} sx={isMobile ? { flex: 1 } : { width: 170 }} />
                </Box>
                {/* presets are small (40px) like the inputs beside them; mobile: 44px touch targets */}
                <Box sx={{ display: 'flex', gap: '8px', '& > .MuiButton-root': isMobile ? { flex: 1 } : undefined }}>
                  {presets.map(p => (
                    <MjButton key={p.name} size={isMobile ? 'medium' : 'small'} variant={active(p) ? 'primary' : 'tertiary'} aria-pressed={active(p)} onClick={() => setRange(active(p) ? {} : { startDate: fmt(p.startDate()), endDate: fmt(p.endDate()) })}>{p.name}</MjButton>
                  ))}
                </Box>
              </Box>
            )
          }
          default:
            return (
              <KrdsTextField key={c.field} size="small" type={c.type === 'number' ? 'number' : 'text'} inputMode={c.type === 'number' ? 'decimal' : undefined} label={c.headerName} value={String(v ?? '')} sx={isMobile ? undefined : { width: 200 }}
                onChange={e => set(c, e.target.value, false)} onKeyDown={e => { if (e.key === 'Enter') { apply(values); setOpen(false) } }} />
            )
        }
      })}
      {!isMobile && <IconButton color="primary" aria-label={labels.search} onClick={() => apply(values)} sx={{ width: 40, height: 40, color: krds.color.iconPrimary, border: `${krds.borderW} solid ${krds.color.buttonTertiaryBorder}`, borderRadius: krds.radius.md, '&:focus-visible': { boxShadow: krds.focusRing } }}>🔍</IconButton>}
    </Box>
  )

  // active filters as removable chips (components/search-filters.md)
  const chips = activeChips.length > 0 && (
    <Box role="group" aria-label={labels.activeFilters} sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap', px: isMobile ? '12px' : '16px', pt: '8px' }} data-testid="mj-filter-chips">
      {activeChips.map(c => {
        const text = `${c.headerName}: ${describe(c, applied[c.field])}`
        return <Chip key={c.field} label={text} onDelete={() => removeOne(c.field)} deleteIcon={<Box component="span" aria-hidden="true" sx={{ px: '4px', fontSize: 14 }}>✕</Box>}
          sx={{ height: 32, borderRadius: krds.radius.max, bgcolor: krds.color.surfaceGraySubtler, border: `${krds.borderW} solid ${krds.color.borderGray}`, fontFamily: krds.font.family, fontSize: krds.fs.bodyXs, color: krds.color.textBasic,
            '& .MuiChip-deleteIcon': { color: krds.color.iconGray, minWidth: 24, minHeight: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: krds.radius.max, '&:hover': { color: krds.color.textDanger } }, '&:focus-visible, & .MuiChip-deleteIcon:focus-visible': { boxShadow: krds.focusRing } }}
          aria-label={text} data-remove-label={labels.removeFilter(c.headerName)} />
      })}
    </Box>
  )

  if (!isMobile) return <>{controls}{chips}</>
  return (
    <>
      <Badge badgeContent={activeCount} color="primary" overlap="rectangular" sx={{ flexShrink: 0 }}>
        <MjButton variant="tertiary" size="medium" aria-label={labels.filters} onClick={() => setOpen(true)} sx={{ whiteSpace: 'nowrap' }}>{labels.filters}</MjButton>
      </Badge>
      <MjSheet open={open} onClose={() => setOpen(false)} title={labels.filters} mobile={mobile!} data-testid="mj-filter-sheet"
        actions={
          <Box sx={{ display: 'flex', gap: '8px' }}>
            <MjButton variant="tertiary" size="large" sx={{ flex: 1 }} onClick={() => { clearAll(); setOpen(false) }}>{labels.clear}</MjButton>
            <MjButton variant="primary" size="large" sx={{ flex: 2 }} onClick={() => { apply(values); setOpen(false) }}>{labels.apply}</MjButton>
          </Box>
        }>
        {controls}
      </MjSheet>
    </>
  )
}
