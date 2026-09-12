import { FormControl, FormControlLabel, FormLabel, MenuItem, Radio, RadioGroup, TextField } from '@mui/material'
import { useMj, useMjOptions } from '../core'
import type { FieldProps, TypeRenderers } from './registry'
import type { MjColumnType } from '../core'

const label = (c: FieldProps['column']) => c.headerName

/** Dialog-form fields. Fully controlled by react-hook-form via value/onChange. */
export function StringField({ column, value, onChange, error, disabled }: FieldProps<'string'>) {
  const p = column.params
  return (
    <TextField fullWidth size="small" label={label(column)} value={(value as string) ?? ''} disabled={disabled}
      required={column.rules?.some(r => r.required)} error={Boolean(error)} helperText={error}
      type={p?.inputType === 'password' ? 'password' : 'text'} multiline={p?.multiline} minRows={p?.rows}
      placeholder={p?.placeholder} autoComplete={p?.autoComplete}
      onChange={e => onChange(e.target.value)} />
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

/** Storage is always YYYY-MM-DD; a native date input needs no extra picker dependency. */
export function DateField({ column, value, onChange, error, disabled }: FieldProps<'date'>) {
  const sel = column.params?.selector ?? 'date'
  const type = sel === 'month' ? 'month' : 'date'
  const v = typeof value === 'string' ? (sel === 'month' ? value.slice(0, 7) : value.slice(0, 10)) : ''
  return (
    <TextField fullWidth size="small" type={type} label={label(column)} value={v} disabled={disabled}
      InputLabelProps={{ shrink: true }} required={column.rules?.some(r => r.required)} error={Boolean(error)} helperText={error}
      onChange={e => onChange(e.target.value ? (sel === 'month' ? `${e.target.value}-01` : e.target.value) : null)} />
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
