import { Dialog, DialogContent, DialogTitle, IconButton, InputAdornment, TextField } from '@mui/material'
import { useState } from 'react'
import type { ColumnOf, MjRow } from '../core'
import { getGridComponent, type EditorProps, type FieldProps, type TypeRenderers } from './registry'
import { displayValue } from './value'

interface PickerProps {
  column: ColumnOf<'selectGrid'>
  value: unknown
  row: MjRow
  onPick: (picked: Record<string, unknown> | null) => void
  error?: string
  disabled?: boolean
  label?: string
  required?: boolean
}

/**
 * A picker, not a text box. The legacy cell was a plain input with an onClick
 * and no onChange or readOnly, so typing into it was silently discarded and
 * the user believed they had entered a value.
 *
 * Read-only field, explicit search/clear affordances, and the nested grid is
 * only mounted (and only fetches) once the dialog opens.
 */
export function SelectGridPicker({ column, value, row, onPick, error, disabled, label, required }: PickerProps) {
  const [open, setOpen] = useState(false)
  const p = column.params
  if (!p) throw new Error(`selectGrid column "${column.field}" needs params.grid`)
  const text = displayValue(column, value, row)
  const title = typeof p.dialogTitle === 'function' ? p.dialogTitle(value, row) : p.dialogTitle ?? `${p.grid.name} 선택`
  const Grid = getGridComponent()
  const nested = { ...p.grid, editMode: 'readonly' as const, hooks: { ...p.grid.hooks, onRowClick: (r: Record<string, unknown>) => { onPick(r); setOpen(false) } } }

  return (
    <>
      <TextField size="small" fullWidth value={text} label={label} required={required} error={Boolean(error)} helperText={error}
        disabled={disabled} onClick={() => !disabled && setOpen(true)}
        inputProps={{ readOnly: true, 'aria-haspopup': 'dialog', style: { cursor: disabled ? 'default' : 'pointer' } }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {text && !disabled && <IconButton size="small" aria-label="지우기" onClick={e => { e.stopPropagation(); onPick(null) }}>✕</IconButton>}
              <IconButton size="small" aria-label="선택" disabled={disabled} onClick={e => { e.stopPropagation(); setOpen(true) }}>🔍</IconButton>
            </InputAdornment>
          )
        }} />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth={p.grid.dialogSize ?? 'md'}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent sx={{ minHeight: 400 }}>{open && <Grid config={nested} />}</DialogContent>
      </Dialog>
    </>
  )
}

function SelectGridEditor({ column, value, row, onChange, error, disabled }: EditorProps<'selectGrid'>) {
  return <SelectGridPicker column={column} value={value} row={row} error={error} disabled={disabled}
    onPick={picked => { onChange(picked, picked ? column.params?.patch?.(picked) : undefined); column.params?.onChange?.(picked, row) }} />
}

function SelectGridField({ column, value, onChange, error, disabled, getValues, setValue }: FieldProps<'selectGrid'>) {
  return <SelectGridPicker column={column} value={value} row={getValues() as MjRow} error={error} disabled={disabled}
    label={column.headerName} required={column.rules?.some(r => r.required)}
    onPick={picked => {
      onChange(picked)
      if (picked && column.params?.patch) for (const [k, v] of Object.entries(column.params.patch(picked))) setValue(k, v)
      column.params?.onChange?.(picked, getValues())
    }} />
}

export const selectGridRenderers: Partial<TypeRenderers> = { Editor: SelectGridEditor as never, Field: SelectGridField as never }
