import { Box, FormControl, FormHelperText, FormLabel, OutlinedInput, Select } from '@mui/material'
import { forwardRef, useId, type ChangeEvent, type FocusEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { krds } from './tokens'

export type KrdsInputSize = 'small' | 'medium' | 'large'

export interface KrdsTextFieldProps {
  id?: string
  label?: ReactNode
  value?: unknown
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur?: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onClick?: (e: MouseEvent<HTMLElement>) => void
  placeholder?: string
  type?: string
  name?: string
  disabled?: boolean
  required?: boolean
  error?: boolean
  /** helper text, or the error message when `error` is set */
  helperText?: ReactNode
  /** small 40 (grid, filters) / medium 48 (forms, default) / large 56 (operator forms) */
  size?: KrdsInputSize
  fullWidth?: boolean
  multiline?: boolean
  minRows?: number
  select?: boolean
  /** native <select> instead of the menu (used where a menu is overkill, e.g. the mobile sort control) */
  native?: boolean
  displayEmpty?: boolean
  children?: ReactNode
  autoComplete?: string
  readOnly?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal' | 'search' | 'tel' | 'email' | 'url'
  startAdornment?: ReactNode
  endAdornment?: ReactNode
  /** extra attributes for the <input> element (aria-*, step, style, enterKeyHint …) */
  inputProps?: Record<string, unknown>
  sx?: Record<string, unknown>
  className?: string
  'aria-label'?: string
  'data-testid'?: string
}

const heights: Record<KrdsInputSize, number> = { small: krds.size.inputSm, medium: krds.size.inputMd, large: krds.size.inputLg }

/**
 * KRDS input (components/forms.md): label ABOVE the field with a red required
 * marker, radius 8, border gray-60 (thicker in high-contrast), focus primary-50
 * at 2px, error danger-50 at 2px + message with icon, disabled gray surface.
 * One FormControl, so label / helper / error are wired with for + aria-describedby.
 */
export const KrdsTextField = forwardRef<HTMLDivElement, KrdsTextFieldProps>(function KrdsTextField(p, ref) {
  const auto = useId()
  const id = p.id ?? `mj-${auto}`
  const helpId = `${id}-help`
  const size = p.size ?? 'medium'
  const height = heights[size]
  const hasHelper = p.helperText !== undefined && p.helperText !== null && p.helperText !== ''
  const inputProps = {
    ...(p.inputProps ?? {}),
    'aria-label': p['aria-label'],
    'aria-describedby': hasHelper ? helpId : undefined,
    'aria-required': p.required || undefined,
    'aria-invalid': p.error || undefined,
    readOnly: p.readOnly,
    inputMode: p.inputMode,
    autoComplete: p.autoComplete
  }
  const inputSx = {
    fontFamily: krds.font.family, fontSize: size === 'large' ? krds.fs.bodyL : krds.fs.bodyM, color: krds.color.textBasic, bgcolor: krds.color.inputSurface,
    borderRadius: krds.radius.md, minHeight: height, ...(p.multiline ? {} : { height }), alignItems: 'center',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: krds.color.inputBorder, borderWidth: krds.borderW, top: 0, '& legend': { display: 'none' } },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: krds.color.borderGrayDark },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: krds.color.inputBorderActive, borderWidth: krds.borderWMd },
    '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: krds.color.inputBorderError, borderWidth: krds.borderWMd },
    '&.Mui-disabled': { bgcolor: krds.color.inputSurfaceDisabled, '& .MuiOutlinedInput-notchedOutline': { borderColor: krds.color.inputBorderDisabled }, '& input, & textarea, & .MuiSelect-select': { WebkitTextFillColor: krds.color.textDisabled, color: krds.color.textDisabled } },
    '& input, & textarea': { px: '16px', py: 0, height: '100%', boxSizing: 'border-box' },
    '& .MuiSelect-select': { px: '16px', py: 0, minHeight: 0, height: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center' },
    '& select': { px: '16px', height: '100%' },
    '&:focus-within': { boxShadow: krds.focusRing }
  }
  const control = p.select
    ? <Select id={id} value={p.value ?? ''} onChange={p.onChange as never} native={p.native} displayEmpty={p.displayEmpty} disabled={p.disabled} error={p.error}
        input={<OutlinedInput sx={inputSx} startAdornment={p.startAdornment} endAdornment={p.endAdornment} inputProps={inputProps} data-testid={p['data-testid']} />}
        inputProps={inputProps}>{p.children}</Select>
    : <OutlinedInput id={id} name={p.name} value={p.value ?? ''} onChange={p.onChange} onBlur={p.onBlur} onKeyDown={p.onKeyDown} placeholder={p.placeholder} type={p.type}
        disabled={p.disabled} error={p.error} multiline={p.multiline} minRows={p.minRows} startAdornment={p.startAdornment} endAdornment={p.endAdornment}
        inputProps={inputProps} sx={inputSx} data-testid={p['data-testid']} />
  return (
    <FormControl ref={ref} fullWidth={p.fullWidth} disabled={p.disabled} error={p.error} onClick={p.onClick} className={p.className} sx={{ ...(p.sx ?? {}) }} data-size={size}>
      {p.label !== undefined && p.label !== null && (
        <FormLabel htmlFor={id} sx={{ display: 'block', mb: '4px', fontFamily: krds.font.family, fontSize: krds.fs.bodyS, fontWeight: 700, color: `${krds.color.textBasic} !important`, lineHeight: 1.5 }}>
          {p.label}{p.required && <Box component="span" aria-hidden="true" sx={{ color: krds.color.textDanger, ml: '2px' }}>*</Box>}
        </FormLabel>
      )}
      {control}
      {hasHelper && (
        <FormHelperText id={helpId} sx={{ mx: 0, mt: '4px', fontFamily: krds.font.family, fontSize: krds.fs.bodyS, color: `${p.error ? krds.color.textDanger : krds.color.textSubtle} !important`, whiteSpace: 'pre-line' }}>
          {p.error && <Box component="span" aria-hidden="true" sx={{ mr: '4px' }}>✕</Box>}{p.helperText}
        </FormHelperText>
      )}
    </FormControl>
  )
})
