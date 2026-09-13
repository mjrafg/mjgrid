import { Autocomplete, Box, Checkbox, FormControl, FormControlLabel, FormLabel, TextField, Typography } from '@mui/material'
import { useId } from 'react'
import { columnTypeRegistry, useMj, useMjOptions, type MjColumnType } from '../core'
import type { FieldProps, TypeRenderers } from './registry'
import { krds, KrdsTextField, MjButton } from './krds'

const KO_DAYS: [string, string, string, string, string, string, string] = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
const req = (c: FieldProps['column']) => c.rules?.some(r => r.required)

/** KRDS field label (above the control, red required marker) for controls that are not a single input. */
export function GroupLabel({ text, required, id, error, htmlFor }: { text: string; required?: boolean; id?: string; error?: string; htmlFor?: string }) {
  return (
    <FormLabel id={id} htmlFor={htmlFor} error={Boolean(error)} sx={{ display: 'block', mb: '4px', fontFamily: krds.font.family, fontSize: krds.fs.bodyS, fontWeight: 700, color: `${krds.color.textBasic} !important` }}>
      {text}{required ? <Box component="span" aria-hidden="true" sx={{ color: krds.color.textDanger, ml: '2px' }}>*</Box> : null}
    </FormLabel>
  )
}
export const ErrorText = ({ text }: { text?: string }) => text
  ? <Typography component="span" role="alert" sx={{ display: 'block', mt: '4px', fontFamily: krds.font.family, fontSize: krds.fs.bodyS, color: krds.color.textDanger }}><Box component="span" aria-hidden="true" sx={{ mr: '4px' }}>✕</Box>{text}</Typography>
  : null

/** Stored HH:mm:ss; native time input works in HH:mm. */
export function TimeField({ column, value, onChange, error, disabled, id, size }: FieldProps<'time'>) {
  const v = typeof value === 'string' ? value.slice(0, 5) : ''
  return <KrdsTextField id={id} fullWidth size={size} type="time" label={column.headerName} value={v} disabled={disabled} required={req(column)}
    inputProps={{ step: (column.params?.step ?? 60) * 60 }} error={Boolean(error)} helperText={error}
    onChange={e => onChange(e.target.value ? `${e.target.value}:00` : null)} />
}

/** Stored "HH:mm HH:mm". */
export function TimeRangeField({ column, value, onChange, error, disabled, id, size }: FieldProps<'timeRange'>) {
  const { start, end } = columnTypeRegistry.timeRange.decode!(value) as { start: string | null; end: string | null }
  const set = (s: string | null, e: string | null) => onChange(s || e ? `${s ?? ''} ${e ?? ''}` : null)
  return (
    <FormControl fullWidth error={Boolean(error)} disabled={disabled}>
      <GroupLabel text={column.headerName} required={req(column)} error={error} />
      <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <KrdsTextField id={id} size={size} type="time" value={start ?? ''} disabled={disabled} aria-label={`${column.headerName} start`} onChange={e => set(e.target.value || null, end)} sx={{ flex: 1 }} />
        <span aria-hidden="true">~</span>
        <KrdsTextField size={size} type="time" value={end ?? ''} disabled={disabled} aria-label={`${column.headerName} end`} onChange={e => set(start, e.target.value || null)} sx={{ flex: 1 }} />
      </Box>
      <ErrorText text={error} />
    </FormControl>
  )
}

/** Stored "1,0,1,0,1,0,0" Sunday-first. */
export function WeekDaysField({ column, value, onChange, error, disabled, id }: FieldProps<'weekDays'>) {
  const days = columnTypeRegistry.weekDays.decode!(value) as boolean[]
  const labels = column.params?.dayLabels ?? KO_DAYS
  const toggle = (i: number, on: boolean) => { const next = [...Array(7)].map((_, k) => (k === i ? on : Boolean(days[k]))); onChange(next.map(b => (b ? '1' : '0')).join(',')) }
  return (
    <FormControl fullWidth error={Boolean(error)} disabled={disabled} role="group" aria-labelledby={id ? `${id}-label` : undefined}>
      <GroupLabel id={id ? `${id}-label` : undefined} text={column.headerName} required={req(column)} error={error} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', '& .MuiFormControlLabel-root': { minHeight: krds.size.touch, mr: 0 } }}>
        {labels.map((l, i) => <FormControlLabel key={l} label={l} control={<Checkbox checked={Boolean(days[i])} onChange={e => toggle(i, e.target.checked)} sx={{ color: krds.color.borderGrayDark, '&.Mui-checked': { color: krds.color.actionPrimaryActive }, '&.Mui-focusVisible': { boxShadow: krds.focusRing, borderRadius: krds.radius.sm } }} />} />)}
      </Box>
      <ErrorText text={error} />
    </FormControl>
  )
}

declare global { interface Window { daum?: { Postcode: new (o: { oncomplete: (d: { address?: string; roadAddress?: string; jibunAddress?: string }) => void }) => { open: () => void } } } }

/** Daum postcode when the host page loaded it; plain text otherwise. */
export function AddressField({ column, value, onChange, error, disabled, id, size }: FieldProps<'address'>) {
  const { labels } = useMj()
  const hasDaum = typeof window !== 'undefined' && Boolean(window.daum?.Postcode)
  const open = () => hasDaum && new window.daum!.Postcode({ oncomplete: d => onChange(d.roadAddress || d.address || d.jibunAddress || '') }).open()
  return (
    <Box sx={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <KrdsTextField id={id} fullWidth size={size} label={column.headerName} value={(value as string) ?? ''} disabled={disabled} required={req(column)}
          error={Boolean(error)} helperText={error} onChange={e => onChange(e.target.value)} onClick={() => hasDaum && !disabled && open()} readOnly={hasDaum} />
      </Box>
      {hasDaum && <MjButton variant="secondary" size={size === 'large' ? 'large' : 'medium'} disabled={disabled} onClick={open} sx={{ whiteSpace: 'nowrap', mt: '27px' }}>{labels.addressSearch}</MjButton>}
    </Box>
  )
}

export function AutocompleteField({ column, value, onChange, error, disabled, getValues, id, size }: FieldProps<'autocomplete'>) {
  const { options, isLoading } = useMjOptions(column.params)
  const fmt = column.params?.textFormatter
  const current = options.find(o => o.value === value || (typeof value === 'object' && value !== null && o.value === (value as { id?: unknown }).id)) ?? null
  const height = size === 'large' ? krds.size.inputLg : krds.size.inputMd
  const auto = useId()
  const inputId = id ?? `mj-ac-${auto}`
  return (
    <FormControl fullWidth error={Boolean(error)} disabled={disabled}>
      <GroupLabel text={column.headerName} required={req(column)} error={error} htmlFor={inputId} />
      <Autocomplete id={inputId} fullWidth options={options} value={current} loading={isLoading} disabled={disabled}
        getOptionLabel={o => (fmt ? fmt(o.text, o.data) : o.text)} isOptionEqualToValue={(a, b) => a.value === b.value}
        onChange={(_, o) => { const v = o ? (o.data ?? o.value) : null; onChange(v); column.params?.onChange?.(v, getValues()) }}
        renderInput={params => <TextField {...params} hiddenLabel error={Boolean(error)} />}
        sx={{ '& .MuiOutlinedInput-root': { minHeight: height, p: '0 8px', borderRadius: krds.radius.md, fontFamily: krds.font.family, fontSize: krds.fs.bodyM, bgcolor: krds.color.inputSurface,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: krds.color.inputBorder, borderWidth: krds.borderW },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: krds.color.inputBorderActive, borderWidth: krds.borderWMd },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: krds.color.inputBorderError, borderWidth: krds.borderWMd },
          '&:focus-within': { boxShadow: krds.focusRing } } }} />
      <ErrorText text={error} />
    </FormControl>
  )
}

export function CustomField({ column, value, onChange, getValues, setValue, id }: FieldProps<'custom'>) {
  const node = column.params?.node
  const rendered = typeof node === 'function' ? (node as (ctx: unknown) => unknown)({ value, onChange, getValues, setValue, id }) : node
  return (
    <FormControl fullWidth>
      <GroupLabel text={column.headerName} required={req(column)} />
      <Box>{rendered as React.ReactNode}</Box>
    </FormControl>
  )
}

export const extraFields: Partial<Record<MjColumnType, Partial<TypeRenderers>>> = {
  time: { Field: TimeField as never, Editor: (({ column, value, onChange, error, disabled }: FieldProps<'time'>) =>
    <KrdsTextField size="small" fullWidth type="time" value={typeof value === 'string' ? value.slice(0, 5) : ''} error={Boolean(error)} disabled={disabled} aria-label={column.headerName}
      onChange={e => onChange(e.target.value ? `${e.target.value}:00` : null)} onClick={e => e.stopPropagation()} />) as never },
  timeRange: { Field: TimeRangeField as never },
  weekDays: { Field: WeekDaysField as never },
  address: { Field: AddressField as never },
  autocomplete: { Field: AutocompleteField as never },
  custom: { Field: CustomField as never }
}
