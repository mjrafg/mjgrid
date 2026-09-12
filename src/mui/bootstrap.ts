import { defaultCells } from './cells'
import { defaultEditors } from './editors'
import { defaultFields } from './fields'
import { extraFields } from './fields2'
import { registerMany, registerType } from './registry'
import { selectGridRenderers } from './selectGrid'

let done = false
/**
 * Registers the built-in renderers. Called from every entry component (Grid,
 * Form) as a plain value import + call, so it survives tree-shaking and does
 * not depend on module evaluation order. Idempotent.
 */
export function ensureDefaults(): void {
  if (done) return
  done = true
  registerMany(Object.fromEntries(Object.entries(defaultCells).map(([t, C]) => [t, { Cell: C }])))
  registerMany(defaultEditors)
  registerMany(defaultFields)
  registerMany(extraFields)
  registerType('selectGrid', selectGridRenderers)
}
