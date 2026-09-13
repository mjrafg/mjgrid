import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { krds } from './tokens'

/** HACCP status semantics (haccp/status-semantics.md): Normal=success, Warning=warning, Deviation=danger, Pending=information, Inactive=gray. */
export type MjSemantic = 'success' | 'warning' | 'danger' | 'information' | 'gray'

/** Default status icons (foundations/icons.md). Always paired with text. */
export const semanticIcon: Record<MjSemantic, string> = { success: '✓', warning: '!', danger: '✕', information: 'i', gray: '—' }

const styles: Record<MjSemantic, { bg: string; fg: string; border: string }> = {
  success: { bg: krds.color.surfaceSuccessSubtler, fg: krds.color.textSuccess, border: krds.color.borderSuccess },
  warning: { bg: krds.color.surfaceWarningSubtler, fg: krds.color.textWarning, border: krds.color.borderWarning },
  danger: { bg: krds.color.surfaceDangerSubtler, fg: krds.color.textDanger, border: krds.color.borderDanger },
  information: { bg: krds.color.surfaceInformationSubtler, fg: krds.color.textInformation, border: krds.color.borderInformation },
  gray: { bg: krds.color.surfaceGraySubtle, fg: krds.color.textSubtle, border: krds.color.borderDisabled }
}

export interface MjBadgeProps {
  semantic: MjSemantic
  /** glyph shown before the text; defaults per semantic; null hides it */
  icon?: string | null
  children: ReactNode
  'data-testid'?: string
}

/**
 * Badge — exact spec (components/badges-status.md): height 24, padding-x 8,
 * pill, body-xsmall 700, icon + text, border only in high-contrast mode.
 */
export function MjBadge({ semantic, icon, children, 'data-testid': testId }: MjBadgeProps) {
  const s = styles[semantic]
  const glyph = icon === undefined ? semanticIcon[semantic] : icon
  return (
    <Box component="span" data-testid={testId ?? 'mj-badge'} data-semantic={semantic}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: krds.size.badge, px: '8px', borderRadius: krds.radius.max, bgcolor: s.bg, color: s.fg,
        fontFamily: krds.font.family, fontSize: krds.fs.bodyXs, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap', border: `${krds.borderW} solid transparent`,
        'html.high-contrast &': { borderColor: s.border } }}>
      {glyph && <Box component="span" aria-hidden="true" sx={{ fontSize: '0.85em' }}>{glyph}</Box>}
      <Box component="span">{children}</Box>
    </Box>
  )
}
