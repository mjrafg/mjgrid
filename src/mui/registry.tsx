import type { ComponentType } from 'react'
import type { ColumnOf, MjColumn, MjColumnType, MjRow } from '../core'

/**
 * Adapter-side registry: which React component renders a column type in each
 * of the three surfaces. Capabilities (can this type be filtered, inline
 * edited, form edited) live in core/registry.ts; this only maps type -> UI.
 *
 * One table, all types, all surfaces - the legacy grid had three switch
 * statements that each covered a different subset.
 */
export interface CellProps<T extends MjColumnType = MjColumnType> {
  column: ColumnOf<T>
  row: MjRow
  value: unknown
}

export interface EditorProps<T extends MjColumnType = MjColumnType> extends CellProps<T> {
  onChange: (value: unknown, patch?: Record<string, unknown>) => void
  error?: string
  disabled?: boolean
}

export interface FieldProps<T extends MjColumnType = MjColumnType> {
  column: ColumnOf<T>
  value: unknown
  onChange: (value: unknown) => void
  error?: string
  disabled?: boolean
  /** current form values, for cross-field logic */
  getValues: () => Record<string, unknown>
  setValue: (field: string, value: unknown) => void
  viewMode?: boolean
}

export interface TypeRenderers {
  Cell: ComponentType<CellProps>
  Editor?: ComponentType<EditorProps>
  Field?: ComponentType<FieldProps>
}

const renderers = new Map<MjColumnType, Partial<TypeRenderers>>()

/**
 * Merges into whatever is already registered for the type, so modules that
 * contribute a Cell, an Editor or a Field can be evaluated in any order.
 * (An earlier version looked the entry up at registration time and broke as
 * soon as the bundler reordered chunks.)
 */
export function registerType<T extends MjColumnType>(type: T, r: Partial<TypeRenderers>): void {
  renderers.set(type, { ...(renderers.get(type) ?? {}), ...r })
}

export function registerMany(map: Partial<Record<MjColumnType, Partial<TypeRenderers>>>): void {
  for (const [type, r] of Object.entries(map) as [MjColumnType, Partial<TypeRenderers>][]) registerType(type, r)
}

export function renderersFor(column: MjColumn): TypeRenderers {
  const r = renderers.get(column.type)
  if (!r?.Cell) throw new Error(`no cell renderer registered for column type "${column.type}"`)
  return r as TypeRenderers
}

export const hasEditor = (c: MjColumn) => Boolean(renderers.get(c.type)?.Editor)
export const hasField = (c: MjColumn) => Boolean(renderers.get(c.type)?.Field)

// The picker needs to render a nested grid, and the grid needs the picker's
// renderers. Registering the grid component here at runtime avoids a module cycle.
export interface NestedGridProps { config: import('../core').MjGridConfig; ref?: import('react').Ref<unknown> }
let gridComponent: ComponentType<NestedGridProps> | null = null
export const setGridComponent = (c: ComponentType<NestedGridProps>) => { gridComponent = c }
export const getGridComponent = (): ComponentType<NestedGridProps> => {
  if (!gridComponent) throw new Error('MjGrid is not registered; import @bluebiz/mjgrid/mui before rendering a picker')
  return gridComponent
}
