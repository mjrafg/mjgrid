import { Checkbox, MenuItem } from '@mui/material'
import { useMjOptions } from '../core'
import type { EditorProps, TypeRenderers } from './registry'
import type { MjColumnType } from '../core'
import { MjDatePicker } from './DatePicker'
import { krds, KrdsTextField } from './krds'
import { checkInput } from './compat'

/**
 * Inline cell editors (KRDS small inputs, 40px). Controlled by the row
 * reducer: `value` in, onChange out on every change. The legacy editor kept
 * a private useState seeded once from props (so refreshed data never showed)
 * and only committed on blur.
 */
export function StringEditor({ column, value, onChange, error, disabled }: EditorProps<'string'>) {
  return <KrdsTextField size="small" fullWidth value={(value as string) ?? ''} error={Boolean(error)} disabled={disabled} aria-label={column.headerName}
    onChange={e => onChange(e.target.value)} onClick={e => e.stopPropagation()} />
}

export function NumberEditor({ column, value, onChange, error, disabled }: EditorProps<'number'>) {
  return <KrdsTextField size="small" fullWidth type="number" inputMode="decimal" value={value === null || value === undefined ? '' : String(value)} aria-label={column.headerName}
    error={Boolean(error)} disabled={disabled} inputProps={{ style: { textAlign: 'right' } }}
    onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} onClick={e => e.stopPropagation()} />
}

export function SelectEditor({ column, value, onChange, error, disabled }: EditorProps<'select'>) {
  const { options } = useMjOptions(column.params)
  const vf = column.params && 'valueField' in column.params ? column.params.valueField ?? 'id' : undefined
  const current = typeof value === 'object' && value !== null && vf ? (value as Record<string, unknown>)[vf] : value
  return (
    <KrdsTextField select size="small" fullWidth value={current ?? ''} error={Boolean(error)} disabled={disabled} aria-label={column.headerName} onClick={e => e.stopPropagation()}
      onChange={e => {
        const opt = options.find(o => String(o.value) === String(e.target.value))
        onChange(vf ? { ...(opt?.data ?? {}), [vf]: opt?.value ?? e.target.value } : opt?.value ?? e.target.value)
      }}>
      {options.map(o => <MenuItem key={String(o.value)} value={String(o.value)}>{o.text}</MenuItem>)}
    </KrdsTextField>
  )
}

export function StatusEditor({ column, value, onChange, error, disabled }: EditorProps<'status'>) {
  const opts = column.params?.options ?? []
  return (
    <KrdsTextField select size="small" fullWidth value={value === null || value === undefined ? '' : String(value)} error={Boolean(error)} disabled={disabled} aria-label={column.headerName} onClick={e => e.stopPropagation()}
      onChange={e => { const hit = opts.find(o => String(o.value) === String(e.target.value)); onChange(hit ? hit.value : e.target.value) }}>
      {opts.map(o => <MenuItem key={String(o.value)} value={String(o.value)}>{o.text}</MenuItem>)}
    </KrdsTextField>
  )
}

export function DateEditor({ column, value, onChange, error, disabled }: EditorProps<'date'>) {
  return <MjDatePicker fullWidth size="small" selector={column.params?.selector ?? 'date'} value={typeof value === 'string' ? value.slice(0, 10) : null} error={Boolean(error)}
    disabled={disabled} aria-label={column.headerName} onChange={onChange} />
}

export function BooleanEditor({ column, value, onChange, disabled }: EditorProps<'boolean'>) {
  return <Checkbox checked={Boolean(value)} disabled={disabled} onChange={e => onChange(e.target.checked)} onClick={e => e.stopPropagation()}
    {...checkInput({ 'aria-label': column.headerName })} sx={{ width: krds.size.touch, height: krds.size.touch, color: krds.color.borderGrayDark, '&.Mui-checked': { color: krds.color.actionPrimaryActive }, '&.Mui-focusVisible': { boxShadow: krds.focusRing, borderRadius: krds.radius.sm } }} />
}

export const defaultEditors: Partial<Record<MjColumnType, Partial<TypeRenderers>>> = Object.fromEntries(
  Object.entries({ string: StringEditor, number: NumberEditor, select: SelectEditor, date: DateEditor, boolean: BooleanEditor, status: StatusEditor }).map(([t, C]) => [t, { Editor: C as never }])
)
