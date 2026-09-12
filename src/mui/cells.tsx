import { Button, Typography, useTheme } from '@mui/material'
import Box from '@mui/material/Box'
import { useState } from 'react'
import type { ColumnOf, MjRow } from '../core'
import { registerType, type CellProps } from './registry'
import { displayValue } from './value'

/** Default read-only cell for every text-like type. */
function TextCell({ column, value, row }: CellProps) {
  return <>{displayValue(column, value, row)}</>
}

function NumberCell({ column, value, row }: CellProps) {
  return <Box sx={{ width: '100%', textAlign: 'right' }}>{displayValue(column, value, row)}</Box>
}

function BooleanCell({ column, value, row }: CellProps<'boolean'>) {
  const theme = useTheme()
  const p = column.params
  const positive = Boolean(value)
  const red = p?.colorPositive ? positive : !positive
  const clickable = Boolean(p?.onClick)
  return (
    <span
      style={{ color: red ? theme.palette.error.main : undefined, cursor: clickable ? 'pointer' : undefined }}
      onClick={clickable ? () => p!.onClick!(positive, row) : undefined}
    >
      {displayValue(column, value, row)}
    </span>
  )
}

function SelectCell({ column, value, row }: CellProps<'select'>) {
  const opts = column.params && 'options' in column.params ? column.params.options : undefined
  const hit = opts?.find(o => o.value === value)
  return <Typography sx={hit?.color ? { color: hit.color } : undefined}>{displayValue(column, value, row)}</Typography>
}

const resolve = <T,>(v: T | ((value: unknown, row: MjRow) => T), value: unknown, row: MjRow): T => (typeof v === 'function' ? (v as (a: unknown, b: MjRow) => T)(value, row) : v)

/** A real component: owns its own loading state. The legacy grid called useState inside renderCell. */
function ButtonCell({ column, value, row }: CellProps<'button'>) {
  const p = column.params
  const [loading, setLoading] = useState(false)
  if (!p) return null
  const visible = p.visible === undefined ? true : resolve(p.visible, value, row)
  if (!visible) return null
  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try { await p.onClick(value, row) } finally { setLoading(false) }
  }
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <Button size="small" disabled={loading} onClick={onClick}
        color={resolve(p.color ?? 'primary', value, row)} variant={resolve(p.variant ?? 'contained', value, row)}>
        {resolve(p.text, value, row)}
      </Button>
    </Box>
  )
}

function FileCell({ column, value, row }: CellProps<'file'>) {
  const name = displayValue(column, value, row)
  if (!name) return null
  const ext = name.slice(name.lastIndexOf('.') + 1)
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <Button size="small" variant="contained" color="secondary" onClick={e => e.stopPropagation()}>{ext}</Button>
      <Typography variant="body2" noWrap>{name}</Typography>
    </Box>
  )
}

function ImageCell({ value }: CellProps<'image'>) {
  const f = value as { thumbnailPath?: string; originalName?: string } | null
  if (!f?.thumbnailPath) return null
  return <img alt={f.originalName ?? ''} src={f.thumbnailPath} style={{ height: '100%', maxHeight: 36, objectFit: 'contain' }} />
}

// --- registration: every column type gets a Cell. Editors/Fields are added by their own modules. ---
registerType('string', { Cell: TextCell })
registerType('number', { Cell: NumberCell })
registerType('select', { Cell: SelectCell as never })
registerType('date', { Cell: TextCell })
registerType('time', { Cell: TextCell })
registerType('timeRange', { Cell: TextCell })
registerType('weekDays', { Cell: TextCell })
registerType('boolean', { Cell: BooleanCell as never })
registerType('image', { Cell: ImageCell as never })
registerType('file', { Cell: FileCell as never })
registerType('address', { Cell: TextCell })
registerType('button', { Cell: ButtonCell as never })
registerType('selectGrid', { Cell: TextCell })
registerType('autocomplete', { Cell: TextCell })
registerType('profile', { Cell: TextCell })
registerType('custom', { Cell: TextCell })

export type { ColumnOf }
