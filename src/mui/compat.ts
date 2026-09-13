import * as mui from '@mui/material'

/**
 * One package, MUI 5.12 through 9. MUI 6 introduced `slotProps` on TextField
 * and Drawer, MUI 9 removed the props they replaced (inputProps, InputProps,
 * InputLabelProps, FormHelperTextProps, SelectProps, PaperProps). The root
 * `version` export exists from 6 on; on 5 it is undefined and we spell props
 * the old way. Namespace access keeps the check tree-shakeable.
 */
export const muiMajor = Number((mui as { version?: string }).version?.split('.')[0] ?? 5)
export const muiSlotApi = muiMajor >= 6

export interface TextFieldSlots {
  /** the <input> element */
  html?: Record<string, unknown>
  /** the Input wrapper (adornments) */
  input?: Record<string, unknown>
  label?: Record<string, unknown>
  helper?: Record<string, unknown>
  select?: Record<string, unknown>
}

/** Spread into <TextField>: `{...tfSlots({ html: { readOnly: true } })}`. */
export function tfSlots(s: TextFieldSlots): Record<string, unknown> {
  if (muiSlotApi) {
    const slotProps: Record<string, unknown> = {}
    if (s.html) slotProps.htmlInput = s.html
    if (s.input) slotProps.input = s.input
    if (s.label) slotProps.inputLabel = s.label
    if (s.helper) slotProps.formHelperText = s.helper
    if (s.select) slotProps.select = s.select
    return { slotProps }
  }
  const out: Record<string, unknown> = {}
  if (s.html) out.inputProps = s.html
  if (s.input) out.InputProps = s.input
  if (s.label) out.InputLabelProps = s.label
  if (s.helper) out.FormHelperTextProps = s.helper
  if (s.select) out.SelectProps = s.select
  return out
}

/** Spread into <Drawer> / <SwipeableDrawer> / <Dialog> to style the paper. */
export function drawerPaper(props: Record<string, unknown>): Record<string, unknown> {
  return muiSlotApi ? { slotProps: { paper: props } } : { PaperProps: props }
}
export const dialogPaper = drawerPaper

/** Spread into <Checkbox> / <Radio> / <Switch> for attributes of the underlying <input>. */
export function checkInput(props: Record<string, unknown>): Record<string, unknown> {
  return muiSlotApi ? { slotProps: { input: props } } : { inputProps: props }
}
