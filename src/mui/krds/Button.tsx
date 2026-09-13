import { Button, type ButtonProps } from '@mui/material'
import React, { forwardRef, type ReactNode } from 'react'
import { krds } from './tokens'

/** KRDS button variants (components/buttons.md): primary / secondary / tertiary / text, danger for destructive actions. */
export type KrdsButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'text' | 'danger'
/** heights xsmall 32 / small 40 / medium 48 / large 56 */
export type KrdsButtonSize = 'xsmall' | 'small' | 'medium' | 'large'

export interface MjButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'color'> {
  variant?: KrdsButtonVariant
  size?: KrdsButtonSize
  children?: ReactNode
  /** render as another element (e.g. 'label' for a file input trigger, 'a' for a download link) */
  component?: React.ElementType
  htmlFor?: string
  download?: string
}

const heights: Record<KrdsButtonSize, number> = { xsmall: krds.size.btnXs, small: krds.size.btnSm, medium: krds.size.btnMd, large: krds.size.btnLg }
const paddingX: Record<KrdsButtonSize, number> = { xsmall: 12, small: 16, medium: 20, large: 24 }
const fontSize: Record<KrdsButtonSize, string> = { xsmall: krds.fs.bodyXs, small: krds.fs.bodyS, medium: krds.fs.bodyM, large: krds.fs.bodyL }

const variantSx: Record<KrdsButtonVariant, Record<string, unknown>> = {
  primary: { bgcolor: krds.color.buttonPrimaryFill, color: krds.color.textInverse, border: `${krds.borderW} solid transparent`,
    '&:hover': { bgcolor: krds.color.buttonPrimaryFillHover }, '&:active': { bgcolor: krds.color.buttonPrimaryFillPressed } },
  secondary: { bgcolor: krds.color.buttonSecondaryFill, color: krds.color.textPrimary, border: `${krds.borderW} solid ${krds.color.buttonSecondaryBorder}`,
    '&:hover': { bgcolor: krds.color.buttonSecondaryFillHover } },
  tertiary: { bgcolor: 'transparent', color: krds.color.textBasic, border: `${krds.borderW} solid ${krds.color.buttonTertiaryBorder}`,
    '&:hover': { bgcolor: krds.color.buttonTertiaryFillHover } },
  text: { bgcolor: 'transparent', color: krds.color.linkDefault, border: `${krds.borderW} solid transparent`,
    '&:hover': { bgcolor: krds.color.buttonTertiaryFillHover, color: krds.color.linkHover } },
  danger: { bgcolor: krds.color.surfaceDangerSubtler, color: krds.color.textDanger, border: `${krds.borderW} solid ${krds.color.borderDanger}`,
    '&:hover': { bgcolor: krds.color.dangerFillHover } }
}

export const MjButton = forwardRef<HTMLButtonElement, MjButtonProps>(function MjButton({ variant = 'tertiary', size = 'medium', sx, children, type = 'button', ...rest }, ref) {
  return (
    <Button ref={ref} type={type} variant="text" disableElevation data-variant={variant} {...rest}
      sx={{
        '--mj-btn-h': `${heights[size]}px`, minHeight: heights[size], px: `${paddingX[size]}px`, borderRadius: size === 'xsmall' ? krds.radius.sm : krds.radius.md,
        fontFamily: krds.font.family, fontSize: fontSize[size], fontWeight: 700, lineHeight: 1.5, textTransform: 'none', minWidth: krds.size.touch, boxShadow: 'none', whiteSpace: 'nowrap',
        ...variantSx[variant],
        '&.Mui-disabled': { bgcolor: krds.color.buttonDisabledFill, borderColor: krds.color.buttonDisabledBorder, color: krds.color.textDisabled },
        '&:focus-visible': { outline: 'none', boxShadow: krds.focusRing },
        ...(sx as object)
      }}>
      {children}
    </Button>
  )
})
