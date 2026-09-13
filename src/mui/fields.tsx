import { Box, Button, FormControl, FormControlLabel, FormLabel, MenuItem, Radio, RadioGroup, TextField } from '@mui/material'
import { useState } from 'react'
import { applyMask, fillUrlTemplate, interpolate, useMj, useMjOptions } from '../core'
import type { FieldProps, TypeRenderers } from './registry'
import type { MjColumnType } from '../core'
import { MjDatePicker } from './DatePicker'

const label = (c: FieldProps['column']) => c.headerName

/** Dialog-form fields. Fully controlled by react-hook-form via value/onChange. */
export function StringField({ column, value, onChange, error, disabled, getValues }: FieldProps<'string'>) {
  const p = column.params
  const { api, labels, messages } = useMj()
  const [checking, setChecking] = useState(false)
  const [checkMsg, setCheckMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const hasCheck = Boolean(p?.valueCheckUrl || p?.valueCheck)
  const runCheck = async () => {
    const v = String(value ?? '')
    if (!v) return
    setChecking(true); setCheckMsg(null)
    try {
      const data = getValues()
      const original = (data as { __original?: Record<string, unknown> }).__original?.[column.field] ?? ''
      if (p?.valueCheck) await p.valueCheck(v, data)
      if (p?.valueCheckUrl) {
        const url = fillUrlTemplate(p.valueCheckUrl, { ...data, value: v, [column.field]: original })
        const env = await api.get<unknown>(url)
        const taken = env.status === 200 && Boolean(env.data)
        setCheckMsg(taken ? { ok: false, text: interpolate(messages.duplicate, { label: column.headerName, value: v }) } : { ok: true, text: interpolate(messages.notDuplicate, { label: column.headerName, value: v }) })
      }
    } finally { setChecking(false) }
  }
  const field = (
    <TextField fullWidth size="small" label={label(column)} value={(value as string) ?? ''} disabled={disabled}
      required={column.rules?.some(r => r.required)} error={Boolean(error) || checkMsg?.ok === false}
      helperText={error ?? checkMsg?.text} FormHelperTextProps={checkMsg?.ok ? { sx: { color: 'success.main' } } : undefined}
      type={p?.inputType === 'password' ? 'password' : 'text'} multiline={p?.multiline} minRows={p?.rows}
      placeholder={p?.placeholder} autoComplete={p?.autoComplete}
      onChange={e => { setCheckMsg(null); onChange(p?.mask ? applyMask(p.mask, e.target.value) : e.target.value) }} />
  )
  if (!hasCheck || disabled) return field
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      {field}
      <Button variant="contained" color="secondary" onClick={runCheck} disabled={checking || !value} sx={{ whiteSpace: 'nowrap', mt: 0.25 }}>{p?.valueCheckText ?? labels.check}</Button>
    </Box>
  )
}

export function NumberField({ column, value, onChange, error, disabled }: FieldProps<'number'>) {
  return (
    <TextField fullWidth size="small" type="number" label={label(column)} value={value === null || value === undefined ? '' : String(value)}
      disabled={disabled} required={column.rules?.some(r => r.required)} error={Boolean(error)} helperText={error}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} />
  )
}

export function SelectField({ column, value, onChange, error, disabled }: FieldProps<'select'>) {
  const { options, isLoading } = useMjOptions(column.params)
  const vf = column.params && 'valueField' in column.params ? column.params.valueField ?? 'id' : undefined
  // objects are stored as {[valueField]: x, ...}; primitives as-is
  const current = typeof value === 'object' && value !== null && vf ? (value as Record<string, unknown>)[vf] : value
  return (
    <TextField select fullWidth size="small" label={label(column)} value={current ?? ''} disabled={disabled || isLoading}
      required={column.rules?.some(r => r.required)} error={Boolean(error)} helperText={error}
      onChange={e => {
        const opt = options.find(o => String(o.value) === String(e.target.value))
        const next = vf ? { ...(opt?.data ?? {}), [vf]: opt?.value ?? e.target.value } : opt?.value ?? e.target.value
        onChange(next)
        column.params?.onChange?.(next, {})
      }}>
      {column.params?.placeholder && <MenuItem value=""><em>{column.params.placeholder}</em></MenuItem>}
      {options.map(o => <MenuItem key={String(o.value)} value={String(o.value)}>{o.text}</MenuItem>)}
    </TextField>
  )
}

/** Storage is always YYYY-MM-DD; the calendar is label-driven so months read the same everywhere. */
export function DateField({ column, value, onChange, error, disabled }: FieldProps<'date'>) {
  return (
    <MjDatePicker fullWidth label={label(column)} selector={column.params?.selector ?? 'date'} value={typeof value === 'string' ? value.slice(0, 10) : null}
      disabled={disabled} required={column.rules?.some(r => r.required)} error={Boolean(error)} helperText={error} onChange={onChange} />
  )
}

export function BooleanField({ column, value, onChange, error, disabled }: FieldProps<'boolean'>) {
  const p = column.params
  const { labels } = useMj()
  return (
    <FormControl error={Boolean(error)} disabled={disabled}>
      <FormLabel sx={{ fontSize: 13 }}>{label(column)}{column.rules?.some(r => r.required) ? ' *' : ''}</FormLabel>
      <RadioGroup row value={value === true ? 'true' : value === false ? 'false' : ''} onChange={e => onChange(e.target.value === 'true')}>
        <FormControlLabel value="true" control={<Radio size="small" />} label={p?.positiveText ?? labels.positive} />
        <FormControlLabel value="false" control={<Radio size="small" />} label={p?.negativeText ?? labels.negative} />
      </RadioGroup>
    </FormControl>
  )
}

export const defaultFields: Partial<Record<MjColumnType, Partial<TypeRenderers>>> = Object.fromEntries(
  Object.entries({ string: StringField, number: NumberField, select: SelectField, date: DateField, boolean: BooleanField }).map(([t, C]) => [t, { Field: C as never }])
)
