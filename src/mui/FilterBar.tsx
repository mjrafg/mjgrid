import { Badge, Box, Button, IconButton, MenuItem, TextField } from '@mui/material'
import { useState } from 'react'
import dayjs from 'dayjs'
import { filterFor, useMj, useMjOptions, type MjColumn, type MjDateRange, type MjFilter, type MjGridConfig } from '../core'
import { MjSheet, type MjMobileState } from './mobile'
import { MjDatePicker } from './DatePicker'

export interface MjFilterBarProps {
  config: MjGridConfig
  onSearch: (filters: MjFilter[]) => void
  /** mobile: renders a badge button that opens the controls in a sheet; place it next to the search box */
  mobile?: MjMobileState
}

function SelectFilter({ column, value, onChange }: { column: Extract<MjColumn, { type: 'select' }>; value: string; onChange: (v: string) => void }) {
  const { options } = useMjOptions(column.params)
  const { labels } = useMj()
  return (
    <TextField select size="small" label={column.headerName} value={value} sx={{ minWidth: 160 }} fullWidth onChange={e => onChange(e.target.value)}>
      {!column.params?.hideAllOption && <MenuItem value=""><em>{labels.all}</em></MenuItem>}
      {options.map(o => <MenuItem key={String(o.value)} value={String(o.value)}>{o.text}</MenuItem>)}
    </TextField>
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
  const clearAll = () => { setValues({}); onSearch([]) }

  const controls = (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', px: isMobile ? 0 : 2, pt: isMobile ? 0 : 2, flexDirection: isMobile ? 'column' : 'row', '& > *': isMobile ? { width: '100%' } : undefined }} data-testid="mj-filter-controls">
      {columns.map(c => {
        const v = values[c.field]
        switch (c.type) {
          case 'select':
            return <SelectFilter key={c.field} column={c} value={String(v ?? '')} onChange={x => set(c, x, true)} />
          case 'boolean':
            return (
              <TextField key={c.field} select size="small" label={c.headerName} value={String(v ?? '')} sx={{ minWidth: 140 }} onChange={e => set(c, e.target.value, true)}>
                <MenuItem value=""><em>{labels.all}</em></MenuItem>
                <MenuItem value="true">{c.params?.positiveText ?? labels.positive}</MenuItem>
                <MenuItem value="false">{c.params?.negativeText ?? labels.negative}</MenuItem>
              </TextField>
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
              <Box key={c.field} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', '& > *': isMobile ? { width: '100%' } : undefined }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <MjDatePicker label={c.headerName} selector={c.params?.selector ?? 'date'} value={r.startDate ?? null} onChange={v => upd('startDate', v ?? '')} sx={isMobile ? { flex: 1 } : { width: 170 }} />
                  <span>~</span>
                  <MjDatePicker aria-label={`${c.headerName} end`} selector={c.params?.selector ?? 'date'} value={r.endDate ?? null} onChange={v => upd('endDate', v ?? '')} sx={isMobile ? { flex: 1 } : { width: 170 }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, '& > .MuiButton-root': isMobile ? { flex: 1 } : undefined }}>
                  {presets.map(p => (
                    <Button key={p.name} size="small" variant={active(p) ? 'contained' : 'outlined'} onClick={() => setRange(active(p) ? {} : { startDate: fmt(p.startDate()), endDate: fmt(p.endDate()) })}>{p.name}</Button>
                  ))}
                </Box>
              </Box>
            )
          }
          default:
            return (
              <TextField key={c.field} size="small" type={c.type === 'number' ? 'number' : 'text'} label={c.headerName} value={String(v ?? '')}
                onChange={e => set(c, e.target.value, false)} onKeyDown={e => { if (e.key === 'Enter') { apply(values); setOpen(false) } }} />
            )
        }
      })}
      {!isMobile && <IconButton color="primary" aria-label={labels.search} onClick={() => apply(values)}>🔍</IconButton>}
    </Box>
  )

  if (!isMobile) return controls
  return (
    <>
      <Badge badgeContent={activeCount} color="primary" overlap="rectangular" sx={{ flexShrink: 0 }}>
        <Button variant="outlined" aria-label={labels.filters} onClick={() => setOpen(true)} sx={{ minHeight: 44, whiteSpace: 'nowrap' }}>{labels.filters}</Button>
      </Badge>
      <MjSheet open={open} onClose={() => setOpen(false)} title={labels.filters} mobile={mobile!} data-testid="mj-filter-sheet"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" color="error" sx={{ flex: 1 }} onClick={() => { clearAll(); setOpen(false) }}>{labels.clear}</Button>
            <Button variant="contained" sx={{ flex: 2 }} onClick={() => { apply(values); setOpen(false) }}>{labels.apply}</Button>
          </Box>
        }>
        {controls}
      </MjSheet>
    </>
  )
}
