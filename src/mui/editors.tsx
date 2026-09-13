import { Checkbox, MenuItem, Select, TextField } from '@mui/material'
import { useMjOptions } from '../core'
import type { EditorProps, TypeRenderers } from './registry'
import type { MjColumnType } from '../core'
import { MjDatePicker } from './DatePicker'
import { tfSlots } from './compat'

/**
 * Inline cell editors. Controlled by the row reducer: `value` in, onChange out
 * on every change. The legacy editor kept a private useState seeded once from
 * props (so refreshed data never showed) and only committed on blur.
 */
export function StringEditor({ value, onChange, error, disabled }: EditorProps<'string'>) {
  return <TextField size="small" fullWidth value={(value as string) ?? ''} error={Boolean(error)} disabled={disabled}
    onChange={e => onChange(e.target.value)} onClick={e => e.stopPropagation()} />
}

export function NumberEditor({ value, onChange, error, disabled }: EditorProps<'number'>) {
  return <TextField size="small" fullWidth type="number" value={value === null || value === undefined ? '' : String(value)}
    error={Boolean(error)} disabled={disabled} {...tfSlots({ html: { style: { textAlign: 'right' } } })}
    onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} onClick={e => e.stopPropagation()} />
}

export function SelectEditor({ column, value, onChange, error, disabled }: EditorProps<'select'>) {
  const { options } = useMjOptions(column.params)
  const vf = column.params && 'valueField' in column.params ? column.params.valueField ?? 'id' : undefined
  const current = typeof value === 'object' && value !== null && vf ? (value as Record<string, unknown>)[vf] : value
  return (
    <Select size="small" fullWidth value={current ?? ''} error={Boolean(error)} disabled={disabled} onClick={e => e.stopPropagation()}
      onChange={e => {
        const opt = options.find(o => String(o.value) === String(e.target.value))
        onChange(vf ? { ...(opt?.data ?? {}), [vf]: opt?.value ?? e.target.value } : opt?.value ?? e.target.value)
      }}>
      {options.map(o => <MenuItem key={String(o.value)} value={String(o.value)}>{o.text}</MenuItem>)}
    </Select>
  )
}

export function DateEditor({ column, value, onChange, error, disabled }: EditorProps<'date'>) {
  return <MjDatePicker fullWidth selector={column.params?.selector ?? 'date'} value={typeof value === 'string' ? value.slice(0, 10) : null} error={Boolean(error)}
    disabled={disabled} aria-label={column.headerName} onChange={onChange} />
}

export function BooleanEditor({ value, onChange, disabled }: EditorProps<'boolean'>) {
  return <Checkbox size="small" checked={Boolean(value)} disabled={disabled} onChange={e => onChange(e.target.checked)} onClick={e => e.stopPropagation()} />
}

export const defaultEditors: Partial<Record<MjColumnType, Partial<TypeRenderers>>> = Object.fromEntries(
  Object.entries({ string: StringEditor, number: NumberEditor, select: SelectEditor, date: DateEditor, boolean: BooleanEditor }).map(([t, C]) => [t, { Editor: C as never }])
)
