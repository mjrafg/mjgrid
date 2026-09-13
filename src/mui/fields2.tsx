import { Autocomplete, Box, Button, Checkbox, FormControl, FormControlLabel, FormLabel, TextField, Typography } from '@mui/material'
import { columnTypeRegistry, useMj, useMjOptions, type MjColumnType } from '../core'
import type { FieldProps, TypeRenderers } from './registry'
import { tfSlots } from './compat'

const KO_DAYS: [string, string, string, string, string, string, string] = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
const req = (c: FieldProps['column']) => c.rules?.some(r => r.required)

/** Stored HH:mm:ss; native time input works in HH:mm. */
export function TimeField({ column, value, onChange, error, disabled }: FieldProps<'time'>) {
  const v = typeof value === 'string' ? value.slice(0, 5) : ''
  return <TextField fullWidth size="small" type="time" label={column.headerName} value={v} disabled={disabled} required={req(column)}
    {...tfSlots({ label: { shrink: true }, html: { step: (column.params?.step ?? 60) * 60 } })} error={Boolean(error)} helperText={error}
    onChange={e => onChange(e.target.value ? `${e.target.value}:00` : null)} />
}

/** Stored "HH:mm HH:mm". */
export function TimeRangeField({ column, value, onChange, error, disabled }: FieldProps<'timeRange'>) {
  const { start, end } = columnTypeRegistry.timeRange.decode!(value) as { start: string | null; end: string | null }
  const set = (s: string | null, e: string | null) => onChange(s || e ? `${s ?? ''} ${e ?? ''}` : null)
  return (
    <FormControl fullWidth error={Boolean(error)} disabled={disabled}>
      <FormLabel sx={{ fontSize: 13, mb: 0.5 }}>{column.headerName}{req(column) ? ' *' : ''}</FormLabel>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField size="small" type="time" value={start ?? ''} disabled={disabled} {...tfSlots({ html: { 'aria-label': `${column.headerName} start` } })} onChange={e => set(e.target.value || null, end)} sx={{ flex: 1 }} />
        <span>~</span>
        <TextField size="small" type="time" value={end ?? ''} disabled={disabled} {...tfSlots({ html: { 'aria-label': `${column.headerName} end` } })} onChange={e => set(start, e.target.value || null)} sx={{ flex: 1 }} />
      </Box>
      {error && <Typography variant="caption" color="error">{error}</Typography>}
    </FormControl>
  )
}

/** Stored "1,0,1,0,1,0,0" Sunday-first. */
export function WeekDaysField({ column, value, onChange, error, disabled }: FieldProps<'weekDays'>) {
  const days = columnTypeRegistry.weekDays.decode!(value) as boolean[]
  const labels = column.params?.dayLabels ?? KO_DAYS
  const toggle = (i: number, on: boolean) => { const next = [...Array(7)].map((_, k) => (k === i ? on : Boolean(days[k]))); onChange(next.map(b => (b ? '1' : '0')).join(',')) }
  return (
    <FormControl fullWidth error={Boolean(error)} disabled={disabled}>
      <FormLabel sx={{ fontSize: 13 }}>{column.headerName}{req(column) ? ' *' : ''}</FormLabel>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {labels.map((l, i) => <FormControlLabel key={l} label={l} control={<Checkbox size="small" checked={Boolean(days[i])} onChange={e => toggle(i, e.target.checked)} />} />)}
      </Box>
      {error && <Typography variant="caption" color="error">{error}</Typography>}
    </FormControl>
  )
}

declare global { interface Window { daum?: { Postcode: new (o: { oncomplete: (d: { address?: string; roadAddress?: string; jibunAddress?: string }) => void }) => { open: () => void } } } }

/** Daum postcode when the host page loaded it; plain text otherwise. */
export function AddressField({ column, value, onChange, error, disabled }: FieldProps<'address'>) {
  const { labels } = useMj()
  const hasDaum = typeof window !== 'undefined' && Boolean(window.daum?.Postcode)
  const open = () => hasDaum && new window.daum!.Postcode({ oncomplete: d => onChange(d.roadAddress || d.address || d.jibunAddress || '') }).open()
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <TextField fullWidth size="small" label={column.headerName} value={(value as string) ?? ''} disabled={disabled} required={req(column)}
        error={Boolean(error)} helperText={error} onChange={e => onChange(e.target.value)} onClick={() => hasDaum && !disabled && open()}
        {...tfSlots({ html: { readOnly: hasDaum } })} />
      {hasDaum && <Button variant="contained" color="secondary" disabled={disabled} onClick={open} sx={{ whiteSpace: 'nowrap', mt: 0.25 }}>{labels.addressSearch}</Button>}
    </Box>
  )
}

export function AutocompleteField({ column, value, onChange, error, disabled, getValues }: FieldProps<'autocomplete'>) {
  const { options, isLoading } = useMjOptions(column.params)
  const fmt = column.params?.textFormatter
  const current = options.find(o => o.value === value || (typeof value === 'object' && value !== null && o.value === (value as { id?: unknown }).id)) ?? null
  return (
    <Autocomplete size="small" fullWidth options={options} value={current} loading={isLoading} disabled={disabled}
      getOptionLabel={o => (fmt ? fmt(o.text, o.data) : o.text)} isOptionEqualToValue={(a, b) => a.value === b.value}
      onChange={(_, o) => { const v = o ? (o.data ?? o.value) : null; onChange(v); column.params?.onChange?.(v, getValues()) }}
      renderInput={p => <TextField {...p} label={column.headerName} required={req(column)} error={Boolean(error)} helperText={error} />} />
  )
}

export function CustomField({ column, value, onChange, getValues, setValue }: FieldProps<'custom'>) {
  const node = column.params?.node
  const rendered = typeof node === 'function' ? (node as (ctx: unknown) => unknown)({ value, onChange, getValues, setValue }) : node
  return (
    <FormControl fullWidth>
      <FormLabel sx={{ fontSize: 13, mb: 0.5 }}>{column.headerName}{req(column) ? ' *' : ''}</FormLabel>
      <Box>{rendered as React.ReactNode}</Box>
    </FormControl>
  )
}

export const extraFields: Partial<Record<MjColumnType, Partial<TypeRenderers>>> = {
  time: { Field: TimeField as never, Editor: (({ value, onChange, error, disabled }: FieldProps<'time'>) =>
    <TextField size="small" fullWidth type="time" value={typeof value === 'string' ? value.slice(0, 5) : ''} error={Boolean(error)} disabled={disabled}
      onChange={e => onChange(e.target.value ? `${e.target.value}:00` : null)} onClick={e => e.stopPropagation()} />) as never },
  timeRange: { Field: TimeRangeField as never },
  weekDays: { Field: WeekDaysField as never },
  address: { Field: AddressField as never },
  autocomplete: { Field: AutocompleteField as never },
  custom: { Field: CustomField as never }
}
