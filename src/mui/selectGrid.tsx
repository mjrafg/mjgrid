import { Box, IconButton, InputAdornment } from '@mui/material'
import { useState } from 'react'
import { useMj, type ColumnOf, type MjRow } from '../core'
import { getGridComponent, type EditorProps, type FieldProps, type TypeRenderers } from './registry'
import { displayValue } from './value'
import { MjSheet, useMjMobile } from './mobile'
import { krds, KrdsTextField } from './krds'

interface PickerProps {
  column: ColumnOf<'selectGrid'>
  value: unknown
  row: MjRow
  onPick: (picked: Record<string, unknown> | null) => void
  error?: string
  disabled?: boolean
  label?: string
  required?: boolean
  id?: string
  size?: 'small' | 'medium' | 'large'
}

/**
 * A picker, not a text box. The legacy cell was a plain input with an onClick
 * and no onChange or readOnly, so typing into it was silently discarded and
 * the user believed they had entered a value.
 *
 * Read-only field, explicit search/clear affordances, and the nested grid is
 * only mounted (and only fetches) once the dialog opens.
 */
export function SelectGridPicker({ column, value, row, onPick, error, disabled, label, required, id, size = 'small' }: PickerProps) {
  const [open, setOpen] = useState(false)
  const { labels } = useMj()
  const p = column.params
  if (!p) throw new Error(`selectGrid column "${column.field}" needs params.grid`)
  const text = displayValue(column, value, row)
  const title = typeof p.dialogTitle === 'function' ? p.dialogTitle(value, row) : p.dialogTitle ?? labels.selectTitle(p.grid.name)
  const Grid = getGridComponent()
  const mobile = useMjMobile(p.grid)
  const nested = { ...p.grid, editMode: 'readonly' as const, hooks: { ...p.grid.hooks, onRowClick: (r: Record<string, unknown>) => { onPick(r); setOpen(false) } }, mobile: { ...p.grid.mobile, history: false } }

  return (
    <>
      <KrdsTextField id={id} size={size} fullWidth value={text} label={label} required={required} error={Boolean(error)} helperText={error}
        disabled={disabled} onClick={() => !disabled && setOpen(true)} readOnly aria-label={label ? undefined : column.headerName}
        inputProps={{ 'aria-haspopup': 'dialog', style: { cursor: disabled ? 'default' : 'pointer' } }}
        endAdornment={
          <InputAdornment position="end">
            {text && !disabled && <IconButton size="small" aria-label={labels.clearValue} onClick={e => { e.stopPropagation(); onPick(null) }} sx={{ color: krds.color.iconGray }}>✕</IconButton>}
            <IconButton size="small" aria-label={labels.pick} disabled={disabled} onClick={e => { e.stopPropagation(); setOpen(true) }} sx={{ color: krds.color.iconGray }}>🔍</IconButton>
          </InputAdornment>
        } />
      <MjSheet open={open} onClose={() => setOpen(false)} title={title} size={p.grid.dialogSize ?? 'md'} mobile={mobile} data-testid="mj-select-grid">
        <Box sx={{ minHeight: mobile.active ? undefined : 400, height: mobile.active ? '70dvh' : undefined }}>{open && <Grid config={nested} />}</Box>
      </MjSheet>
    </>
  )
}

function SelectGridEditor({ column, value, row, onChange, error, disabled }: EditorProps<'selectGrid'>) {
  return <SelectGridPicker column={column} value={value} row={row} error={error} disabled={disabled}
    onPick={picked => { onChange(picked, picked ? column.params?.patch?.(picked) : undefined); column.params?.onChange?.(picked, row) }} />
}

function SelectGridField({ column, value, onChange, error, disabled, getValues, setValue, id, size }: FieldProps<'selectGrid'>) {
  return <SelectGridPicker column={column} value={value} row={getValues() as MjRow} error={error} disabled={disabled} id={id} size={size}
    label={column.headerName} required={column.rules?.some(r => r.required)}
    onPick={picked => {
      onChange(picked)
      if (picked && column.params?.patch) for (const [k, v] of Object.entries(column.params.patch(picked))) setValue(k, v)
      column.params?.onChange?.(picked, getValues())
    }} />
}

export const selectGridRenderers: Partial<TypeRenderers> = { Editor: SelectGridEditor as never, Field: SelectGridField as never }
