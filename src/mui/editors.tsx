import { Checkbox, MenuItem, Select, TextField } from '@mui/material'
import { useMjOptions } from '../core'
import { registerType, renderersFor, type EditorProps } from './registry'

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
    error={Boolean(error)} disabled={disabled} inputProps={{ style: { textAlign: 'right' } }}
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

export function DateEditor({ value, onChange, error, disabled }: EditorProps<'date'>) {
  return <TextField size="small" fullWidth type="date" value={typeof value === 'string' ? value.slice(0, 10) : ''} error={Boolean(error)}
    disabled={disabled} onChange={e => onChange(e.target.value || null)} onClick={e => e.stopPropagation()} />
}

export function BooleanEditor({ value, onChange, disabled }: EditorProps<'boolean'>) {
  return <Checkbox size="small" checked={Boolean(value)} disabled={disabled} onChange={e => onChange(e.target.checked)} onClick={e => e.stopPropagation()} />
}

const add = (type: Parameters<typeof registerType>[0], Editor: unknown) =>
  registerType(type, { ...renderersFor({ type, field: '', headerName: '' } as never), Editor: Editor as never })

add('string', StringEditor)
add('number', NumberEditor)
add('select', SelectEditor)
add('date', DateEditor)
add('boolean', BooleanEditor)
