import { Box, Button, IconButton, InputAdornment, Popover, TextField, Typography } from '@mui/material'
import dayjs from 'dayjs'
// explicit .js: dayjs has no exports map, and Node's native ESM loader (Next SSR) rejects extensionless deep imports
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useMj, type MjLabels } from '../core'
import { MjSheet, useMjMobile } from './mobile'

dayjs.extend(customParseFormat)

export type MjDateSelector = 'date' | 'month' | 'year'

/** Storage is always YYYY-MM-DD (first day for month/year selectors). */
const ISO = 'YYYY-MM-DD'
const toIso = (d: dayjs.Dayjs, selector: MjDateSelector) =>
  (selector === 'year' ? d.startOf('year') : selector === 'month' ? d.startOf('month') : d).format(ISO)
const displayFormat = (L: MjLabels, selector: MjDateSelector) => (selector === 'year' ? L.yearFormat : selector === 'month' ? L.monthFormat : L.dateFormat)

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface MjCalendarProps {
  value: string | null
  selector: MjDateSelector
  onPick: (iso: string | null) => void
  /** larger touch targets */
  touch?: boolean
}

/**
 * Month / month-of-year / year-of-decade grids driven entirely by labels, so
 * every browser and OS shows the same Korean (or whatever the host passes)
 * calendar. The native date input rendered its popup in the OS locale.
 */
export function MjCalendar({ value, selector, onPick, touch }: MjCalendarProps) {
  const { labels: L } = useMj()
  const selected = value ? dayjs(value) : null
  const today = dayjs()
  const [view, setView] = useState(() => (selected?.isValid() ? selected : today).startOf('month'))
  useEffect(() => { if (selected?.isValid()) setView(selected.startOf('month')) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const cell = touch ? 44 : 36
  const years = useMemo(() => { const y = view.year(); return Array.from({ length: 101 }, (_, i) => y - 80 + i) }, [view])

  const dayCells = useMemo(() => {
    const start = view.startOf('month').day(0)
    return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'))
  }, [view])
  const decadeStart = Math.floor(view.year() / 10) * 10

  const cellSx = (active: boolean, muted = false, isToday = false) => ({
    minWidth: cell, width: cell, height: cell, p: 0, borderRadius: 1, fontSize: 14, fontWeight: active ? 700 : 400,
    color: active ? 'primary.contrastText' : muted ? 'text.disabled' : 'text.primary',
    bgcolor: active ? 'primary.main' : undefined, outline: isToday && !active ? '1px solid' : undefined, outlineColor: 'primary.main',
    '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' }
  })
  const selectSx = { border: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: 'inherit' }

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
      <IconButton size="small" aria-label={selector === 'date' ? L.prevMonth : L.prevYear} onClick={() => setView(v => (selector === 'date' ? v.subtract(1, 'month') : selector === 'month' ? v.subtract(1, 'year') : v.subtract(10, 'year')))}>‹</IconButton>
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 0.5 }}>
        {selector === 'year'
          ? <Typography fontWeight={600}>{decadeStart}–{decadeStart + 11}</Typography>
          : <>
              <select aria-label={L.yearFormat} value={view.year()} style={selectSx} onChange={e => setView(v => v.year(Number(e.target.value)))}>
                {years.map(y => <option key={y} value={y}>{L.calendarTitle(y, view.month() + 1).replace(L.monthNames[view.month()]!, '').trim() || y}</option>)}
              </select>
              {selector === 'date' && (
                <select aria-label={L.monthFormat} value={view.month()} style={selectSx} onChange={e => setView(v => v.month(Number(e.target.value)))}>
                  {L.monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              )}
            </>}
      </Box>
      <IconButton size="small" aria-label={selector === 'date' ? L.nextMonth : L.nextYear} onClick={() => setView(v => (selector === 'date' ? v.add(1, 'month') : selector === 'month' ? v.add(1, 'year') : v.add(10, 'year')))}>›</IconButton>
    </Box>
  )

  let grid
  if (selector === 'date') {
    grid = (
      <Box role="grid" sx={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cell}px)`, gap: 0.25, justifyContent: 'center' }}>
        {L.weekdayNames.map((w, i) => <Typography key={w} role="columnheader" align="center" variant="caption" sx={{ lineHeight: `${cell * 0.7}px`, color: i === 0 ? 'error.main' : i === 6 ? 'primary.main' : 'text.secondary' }}>{w}</Typography>)}
        {dayCells.map(d => {
          const iso = d.format(ISO)
          const active = selected?.isValid() === true && selected.isSame(d, 'day')
          return (
            <Button key={iso} role="gridcell" aria-label={iso} aria-selected={active || undefined} onClick={() => onPick(iso)}
              sx={cellSx(active, !d.isSame(view, 'month'), d.isSame(today, 'day'))}>{d.date()}</Button>
          )
        })}
      </Box>
    )
  } else if (selector === 'month') {
    grid = (
      <Box role="grid" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5 }}>
        {L.monthNames.map((m, i) => {
          const d = view.month(i).startOf('month')
          const active = selected?.isValid() === true && selected.isSame(d, 'month')
          return <Button key={m} role="gridcell" aria-selected={active || undefined} onClick={() => onPick(d.format(ISO))} sx={{ ...cellSx(active, false, d.isSame(today, 'month')), width: 'auto', minWidth: 0 }}>{m}</Button>
        })}
      </Box>
    )
  } else {
    grid = (
      <Box role="grid" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5 }}>
        {Array.from({ length: 12 }, (_, i) => decadeStart + i).map(y => {
          const d = dayjs().year(y).startOf('year')
          const active = selected?.isValid() === true && selected.year() === y
          return <Button key={y} role="gridcell" aria-selected={active || undefined} onClick={() => onPick(d.format(ISO))} sx={{ ...cellSx(active, false, today.year() === y), width: 'auto', minWidth: 0 }}>{y}</Button>
        })}
      </Box>
    )
  }

  return (
    <Box sx={{ p: 1.5, minWidth: cell * 7 + 24 }} data-testid="mj-calendar">
      {header}
      {grid}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Button size="small" onClick={() => onPick(null)}>{L.clearValue}</Button>
        <Button size="small" onClick={() => onPick(toIso(today, selector))}>{L.today}</Button>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Picker: text field (typed input in the display format) + calendar popover / sheet
// ---------------------------------------------------------------------------

export interface MjDatePickerProps {
  value: string | null | undefined
  onChange: (iso: string | null) => void
  selector?: MjDateSelector
  label?: string
  required?: boolean
  disabled?: boolean
  error?: boolean
  helperText?: string
  fullWidth?: boolean
  size?: 'small' | 'medium'
  placeholder?: string
  'aria-label'?: string
  sx?: Record<string, unknown>
}

export function MjDatePicker({ value, onChange, selector = 'date', label, required, disabled, error, helperText, fullWidth, size = 'small', placeholder, 'aria-label': ariaLabel, sx }: MjDatePickerProps) {
  const { labels: L } = useMj()
  const mobile = useMjMobile()
  const fmt = displayFormat(L, selector)
  const iso = typeof value === 'string' && value ? value : null
  const shown = iso && dayjs(iso).isValid() ? dayjs(iso).format(fmt) : ''
  const [text, setText] = useState(shown)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  useEffect(() => { setText(shown) }, [shown])
  const open = mobile.active ? sheetOpen : anchor !== null
  const close = () => { setAnchor(null); setSheetOpen(false) }

  const commitText = () => {
    const t = text.trim()
    if (!t) { if (iso) onChange(null); return }
    const d = dayjs(t, fmt, true)
    if (d.isValid()) onChange(toIso(d, selector)); else setText(shown)
  }
  const openCalendar = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    if (disabled) return
    if (mobile.active) setSheetOpen(true); else setAnchor(e.currentTarget)
  }
  const pick = (v: string | null) => { onChange(v); close() }

  const calendar = <MjCalendar value={iso} selector={selector} onPick={pick} touch={mobile.active} />
  return (
    <>
      <TextField size={size} fullWidth={fullWidth} label={label} required={required} disabled={disabled} error={error} helperText={helperText}
        value={text} placeholder={placeholder ?? fmt} sx={sx} onClick={e => e.stopPropagation()}
        inputProps={{ 'aria-label': ariaLabel, inputMode: 'numeric' }} InputLabelProps={{ shrink: true }}
        onChange={e => setText(e.target.value)} onBlur={commitText} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitText() } }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" edge="end" aria-label={L.openCalendar} aria-haspopup="dialog" disabled={disabled} onClick={openCalendar}>📅</IconButton>
            </InputAdornment>
          )
        }} />
      {mobile.active
        ? <MjSheet open={open} onClose={close} title={label ?? ariaLabel} mobile={mobile} data-testid="mj-date-sheet"><Box sx={{ display: 'flex', justifyContent: 'center' }}>{calendar}</Box></MjSheet>
        : <Popover open={open} anchorEl={anchor} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} onClick={e => e.stopPropagation()}>{calendar}</Popover>}
    </>
  )
}
