import { Box, FormControl, FormControlLabel, FormLabel, MenuItem, Radio, RadioGroup } from '@mui/material'
import { useState } from 'react'
import { applyMask, fillUrlTemplate, interpolate, useMj, useMjOptions } from '../core'
import type { FieldProps, TypeRenderers } from './registry'
import type { MjColumnType } from '../core'
import { MjDatePicker } from './DatePicker'
import { krds, KrdsTextField, MjButton } from './krds'

const label = (c: FieldProps['column']) => c.headerName

/** Dialog-form fields. Fully controlled by react-hook-form via value/onChange. */
export function StringField({ column, value, onChange, error, disabled, getValues, id, size }: FieldProps<'string'>) {
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
    <KrdsTextField id={id} fullWidth size={size} label={label(column)} value={(value as string) ?? ''} disabled={disabled}
      required={column.rules?.some(r => r.required)} error={Boolean(error) || checkMsg?.ok === false}
      helperText={error ?? checkMsg?.text} sx={checkMsg?.ok ? { '& .MuiFormHelperText-root': { color: `${krds.color.textSuccess} !important` } } : undefined}
      type={p?.inputType === 'password' ? 'password' : 'text'} multiline={p?.multiline} minRows={p?.rows}
      placeholder={p?.placeholder} autoComplete={p?.autoComplete}
      onChange={e => { setCheckMsg(null); onChange(p?.mask ? applyMask(p.mask, e.target.value) : e.target.value) }} />
  )
  if (!hasCheck || disabled) return field
  return (
    <Box sx={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>{field}</Box>
      <MjButton variant="secondary" size={size === 'large' ? 'large' : 'medium'} onClick={runCheck} disabled={checking || !value} sx={{ whiteSpace: 'nowrap', mt: '27px' }}>{p?.valueCheckText ?? labels.check}</MjButton>
    </Box>
  )
}

export function NumberField({ column, value, onChange, error, disabled, id, size }: FieldProps<'number'>) {
  return (
    <KrdsTextField id={id} fullWidth size={size} type="number" inputMode="decimal" label={label(column)} value={value === null || value === undefined ? '' : String(value)}
      disabled={disabled} required={column.rules?.some(r => r.required)} error={Boolean(error)} helperText={error}
      endAdornment={column.params?.unitField ? undefined : undefined}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} />
  )
}

export function SelectField({ column, value, onChange, error, disabled, id, size }: FieldProps<'select'>) {
  const { options, isLoading } = useMjOptions(column.params)
  const vf = column.params && 'valueField' in column.params ? column.params.valueField ?? 'id' : undefined
  // objects are stored as {[valueField]: x, ...}; primitives as-is
  const current = typeof value === 'object' && value !== null && vf ? (value as Record<string, unknown>)[vf] : value
  return (
    <KrdsTextField id={id} select fullWidth size={size} label={label(column)} value={current ?? ''} disabled={disabled || isLoading} displayEmpty={Boolean(column.params?.placeholder)}
      required={column.rules?.some(r => r.required)} error={Boolean(error)} helperText={error}
      onChange={e => {
        const opt = options.find(o => String(o.value) === String(e.target.value))
        const next = vf ? { ...(opt?.data ?? {}), [vf]: opt?.value ?? e.target.value } : opt?.value ?? e.target.value
        onChange(next)
        column.params?.onChange?.(next, {})
      }}>
      {column.params?.placeholder && <MenuItem value=""><em>{column.params.placeholder}</em></MenuItem>}
      {options.map(o => <MenuItem key={String(o.value)} value={String(o.value)}>{o.text}</MenuItem>)}
    </KrdsTextField>
  )
}

/** HACCP status: select among the configured codes; the cell shows the badge. */
export function StatusField({ column, value, onChange, error, disabled, id, size }: FieldProps<'status'>) {
  const opts = column.params?.options ?? []
  return (
    <KrdsTextField id={id} select fullWidth size={size} label={label(column)} value={value === null || value === undefined ? '' : String(value)} disabled={disabled} displayEmpty={Boolean(column.params?.placeholder)}
      required={column.rules?.some(r => r.required)} error={Boolean(error)} helperText={error}
      onChange={e => { const hit = opts.find(o => String(o.value) === String(e.target.value)); onChange(hit ? hit.value : e.target.value) }}>
      {column.params?.placeholder && <MenuItem value=""><em>{column.params.placeholder}</em></MenuItem>}
      {opts.map(o => <MenuItem key={String(o.value)} value={String(o.value)}>{o.text}</MenuItem>)}
    </KrdsTextField>
  )
}

/** Storage is always YYYY-MM-DD; the calendar is label-driven so months read the same everywhere. */
export function DateField({ column, value, onChange, error, disabled, id, size }: FieldProps<'date'>) {
  return (
    <MjDatePicker id={id} fullWidth size={size} label={label(column)} selector={column.params?.selector ?? 'date'} value={typeof value === 'string' ? value.slice(0, 10) : null}
      disabled={disabled} required={column.rules?.some(r => r.required)} error={Boolean(error)} helperText={error} onChange={onChange} />
  )
}

export function BooleanField({ column, value, onChange, error, disabled, id }: FieldProps<'boolean'>) {
  const p = column.params
  const { labels } = useMj()
  return (
    <FormControl error={Boolean(error)} disabled={disabled}>
      <FormLabel id={id ? `${id}-label` : undefined} sx={{ fontFamily: krds.font.family, fontSize: krds.fs.bodyS, fontWeight: 700, color: `${krds.color.textBasic} !important` }}>
        {label(column)}{column.rules?.some(r => r.required) ? <Box component="span" aria-hidden="true" sx={{ color: krds.color.textDanger, ml: '2px' }}>*</Box> : null}
      </FormLabel>
      <RadioGroup row aria-labelledby={id ? `${id}-label` : undefined} value={value === true ? 'true' : value === false ? 'false' : ''} onChange={e => onChange(e.target.value === 'true')} sx={{ '& .MuiFormControlLabel-root': { minHeight: krds.size.touch, mr: '16px' }, '& .MuiRadio-root:focus-visible, & .MuiRadio-root.Mui-focusVisible': { boxShadow: krds.focusRing, borderRadius: krds.radius.max } }}>
        <FormControlLabel value="true" control={<Radio id={id} sx={{ color: krds.color.borderGrayDark, '&.Mui-checked': { color: krds.color.actionPrimaryActive } }} />} label={p?.positiveText ?? labels.positive} />
        <FormControlLabel value="false" control={<Radio sx={{ color: krds.color.borderGrayDark, '&.Mui-checked': { color: krds.color.actionPrimaryActive } }} />} label={p?.negativeText ?? labels.negative} />
      </RadioGroup>
      {error && <Box component="span" role="alert" sx={{ mt: '4px', fontSize: krds.fs.bodyS, color: krds.color.textDanger }}><Box component="span" aria-hidden="true" sx={{ mr: '4px' }}>✕</Box>{error}</Box>}
    </FormControl>
  )
}

export const defaultFields: Partial<Record<MjColumnType, Partial<TypeRenderers>>> = Object.fromEntries(
  Object.entries({ string: StringField, number: NumberField, select: SelectField, date: DateField, boolean: BooleanField, status: StatusField }).map(([t, C]) => [t, { Field: C as never }])
)
