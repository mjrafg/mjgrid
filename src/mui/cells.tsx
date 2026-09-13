import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { useMj, type ColumnOf, type MjRow } from '../core'
import type { CellProps } from './registry'
import type { ComponentType } from 'react'
import type { MjColumnType } from '../core'
import { displayValue } from './value'
import { krds, MjBadge, MjButton } from './krds'

/** Default read-only cell for every text-like type. */
function TextCell({ column, value, row }: CellProps) {
  if (column.renderCell) return <>{column.renderCell({ value, row, column }) as React.ReactNode}</>
  return <>{displayValue(column, value, row)}</>
}

function NumberCell({ column, value, row }: CellProps) {
  return <Box sx={{ width: '100%', textAlign: 'right' }}>{displayValue(column, value, row)}</Box>
}

/** Boolean shown as a badge (icon + text), never color alone: positive = success, negative = gray. */
function BooleanCell({ column, value, row }: CellProps<'boolean'>) {
  const { labels } = useMj()
  const p = column.params
  const positive = Boolean(value)
  const badge = <MjBadge semantic={positive ? 'success' : 'gray'}>{displayValue(column, value, row, labels)}</MjBadge>
  if (!p?.onClick) return badge
  return (
    <Box component="button" type="button" onClick={e => { e.stopPropagation(); p.onClick!(positive, row) }}
      sx={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', borderRadius: krds.radius.max, '&:focus-visible': { boxShadow: krds.focusRing } }}>{badge}</Box>
  )
}

function StatusCell({ column, value }: CellProps<'status'>) {
  if (value === null || value === undefined || value === '') return null
  const opt = column.params?.options.find(o => String(o.value) === String(value))
  if (!opt) return <MjBadge semantic="gray">{String(value)}</MjBadge>
  return <MjBadge semantic={opt.semantic} icon={opt.icon}>{opt.text}</MjBadge>
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
  // MUI colour/variant params map onto KRDS variants: contained primary -> primary, outlined -> tertiary, error -> danger, text -> text
  const variant = resolve(p.variant ?? 'contained', value, row)
  const color = resolve(p.color ?? 'primary', value, row)
  const krdsVariant = color === 'error' ? 'danger' : variant === 'text' ? 'text' : variant === 'outlined' ? (color === 'primary' ? 'secondary' : 'tertiary') : color === 'primary' ? 'primary' : 'secondary'
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <MjButton size="xsmall" variant={krdsVariant} disabled={loading} onClick={onClick}>{resolve(p.text, value, row)}</MjButton>
    </Box>
  )
}

export const defaultCells: Record<MjColumnType, ComponentType<CellProps>> = {
  string: TextCell, number: NumberCell, select: SelectCell as never, date: TextCell, time: TextCell, timeRange: TextCell,
  weekDays: TextCell, boolean: BooleanCell as never, image: TextCell, file: TextCell, address: TextCell,
  button: ButtonCell as never, selectGrid: TextCell, autocomplete: TextCell, profile: TextCell, custom: TextCell, status: StatusCell as never
}

export type { ColumnOf }
