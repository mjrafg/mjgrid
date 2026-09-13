import { Box, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, IconButton, MenuItem, SwipeableDrawer, TextField, Typography, useMediaQuery } from '@mui/material'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { capabilitiesOf, useMj, type MjColumn, type MjGridConfig, type MjMobileOptions, type MjRow, type MjSort } from '../core'

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export const DEFAULT_MOBILE_BREAKPOINT = 768

export interface MjMobileState extends Required<Pick<MjMobileOptions, 'layout' | 'cardFields' | 'sheet'>> {
  /** the grid is rendering its mobile layout */
  active: boolean
  /** overlays should push a history entry */
  history: boolean
}

/** Provider defaults merged under the config's `mobile`, resolved against the viewport. */
export function useMjMobile(config: MjGridConfig): MjMobileState {
  const { mobile: providerDefaults } = useMj()
  const o: MjMobileOptions = { ...providerDefaults, ...config.mobile }
  const breakpoint = o.breakpoint ?? DEFAULT_MOBILE_BREAKPOINT
  const narrow = useMediaQuery(`(max-width:${breakpoint - 0.05}px)`, { noSsr: true })
  const active = o.enabled === true ? true : o.enabled === false ? false : narrow
  return {
    active,
    layout: o.layout ?? 'cards',
    cardFields: o.cardFields ?? 3,
    sheet: o.sheet ?? 'sheet',
    history: o.history === 'always' ? true : o.history === false ? false : active
  }
}

// ---------------------------------------------------------------------------
// Browser back closes the open overlay
// ---------------------------------------------------------------------------

const MJ_KEY = '__mjOverlay'
let overlaySeq = 0

// history.back() is asynchronous in every browser: the popstate lands a task
// later. An overlay opened in that window would push on top of the entry
// about to be popped and get closed by our own back. So a push waits for
// every back we issued to land first.
let pendingBacks = 0
let waiters: (() => void)[] = []
let listening = false
const overlayState = () => (window.history.state ?? {}) as Record<string, unknown>
function silentBack() {
  if (!listening) {
    listening = true
    window.addEventListener('popstate', () => {
      if (pendingBacks === 0) return
      pendingBacks--
      if (pendingBacks === 0) { const w = waiters; waiters = []; for (const fn of w) fn() }
    })
  }
  pendingBacks++
  window.history.back()
}
const whenSettled = (fn: () => void) => { if (pendingBacks === 0) fn(); else waiters.push(fn) }
/** test hook: true while a back issued by an overlay has not landed yet */
export const hasPendingHistoryBack = () => pendingBacks > 0

/**
 * While `open`, one history entry tagged with this overlay's id sits on top
 * of the stack. Back pops it -> popstate -> onClose. Closing from the UI
 * while the entry is still on top pops it silently, so the stack never keeps
 * a phantom entry. Nested overlays (form -> picker -> confirm) stack: each
 * back closes the innermost one.
 */
export function useHistoryDismiss(open: boolean, onClose: () => void, enabled: boolean): void {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open || !enabled || typeof window === 'undefined') return
    const id = `mj${++overlaySeq}`
    let pushed = false
    let cancelled = false
    const onPop = () => {
      if (!pushed || overlayState()[MJ_KEY] === id) return
      pushed = false
      closeRef.current()
    }
    whenSettled(() => {
      if (cancelled) return
      window.history.pushState({ ...overlayState(), [MJ_KEY]: id }, '')
      pushed = true
      window.addEventListener('popstate', onPop)
    })
    return () => {
      cancelled = true
      window.removeEventListener('popstate', onPop)
      if (pushed && overlayState()[MJ_KEY] === id) silentBack()
    }
  }, [open, enabled])
}

// ---------------------------------------------------------------------------
// Sheet: Dialog on desktop, bottom sheet / full screen on mobile
// ---------------------------------------------------------------------------

export interface MjSheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  /** sticky footer, e.g. form buttons */
  actions?: ReactNode
  mobile: MjMobileState
  /** desktop Dialog maxWidth */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  'data-testid'?: string
}

/** Inputs at 16px stop iOS from zooming the page on focus; 44px targets are the platform minimum. */
export const touchSx = {
  '& input, & textarea, & .MuiSelect-select, & .MuiAutocomplete-input': { fontSize: 16 },
  '& .MuiButton-root': { minHeight: 44 },
  '& .MuiIconButton-root': { minWidth: 44, minHeight: 44 }
} as const

export function MjSheet({ open, onClose, title, children, actions, mobile, size, 'data-testid': testId }: MjSheetProps) {
  const { labels: L } = useMj()
  useHistoryDismiss(open, onClose, mobile.history)
  if (!mobile.active) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth={size ?? 'sm'} data-testid={testId}>
        {title !== undefined && <DialogTitle align="center">{title}</DialogTitle>}
        <DialogContent>{children}</DialogContent>
        {actions && <Box sx={{ px: 3, pb: 2 }}>{actions}</Box>}
      </Dialog>
    )
  }
  const full = mobile.sheet === 'full'
  return (
    // keepMounted:false — the SwipeableDrawer default keeps a closed sheet in the DOM, which would keep form state alive across opens
    <SwipeableDrawer anchor="bottom" open={open} onClose={onClose} onOpen={() => {}} disableSwipeToOpen data-testid={testId} ModalProps={{ keepMounted: false }}
      PaperProps={{ sx: { borderTopLeftRadius: full ? 0 : 16, borderTopRightRadius: full ? 0 : 16, height: full ? '100dvh' : 'auto', maxHeight: full ? '100dvh' : '92dvh', display: 'flex', flexDirection: 'column', ...touchSx } }}>
      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', px: 1, pt: 1, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        {!full && <Box sx={{ position: 'absolute', top: 6, left: '50%', width: 36, height: 4, borderRadius: 2, bgcolor: 'divider', transform: 'translateX(-50%)' }} />}
        <IconButton aria-label={L.close} onClick={onClose} sx={{ mt: full ? 0 : 1 }}>✕</IconButton>
        <Typography variant="subtitle1" sx={{ flex: 1, textAlign: 'center', fontWeight: 600, mt: full ? 0 : 1, pr: 5.5 }}>{title}</Typography>
      </Box>
      <Box sx={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', p: 2, WebkitOverflowScrolling: 'touch' }}>{children}</Box>
      {actions && <Box sx={{ flexShrink: 0, p: 1.5, pb: 'max(12px, env(safe-area-inset-bottom))', borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>{actions}</Box>}
    </SwipeableDrawer>
  )
}

// ---------------------------------------------------------------------------
// Sort control (cards have no clickable headers)
// ---------------------------------------------------------------------------

export interface MjSortControlProps {
  columns: MjColumn[]
  sort: MjSort
  onChange: (sort: MjSort) => void
  sortKey: (c: MjColumn) => string
}

export function MjSortControl({ columns, sort, onChange, sortKey }: MjSortControlProps) {
  const { labels: L } = useMj()
  const sortable = columns.filter(c => c.sortable !== false && c.type !== 'button')
  const current = sortable.find(c => sortKey(c) === sort.field)
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', px: 2, pb: 1 }}>
      <TextField select size="small" label={L.sort} value={current ? sortKey(current) : ''} sx={{ flex: 1 }} SelectProps={{ native: true }} InputLabelProps={{ shrink: true }}
        inputProps={{ 'aria-label': L.sort }} onChange={e => e.target.value && onChange({ field: e.target.value, direction: sort.direction })}>
        {!current && <option value="">{columns.find(c => c.field === sort.field)?.headerName ?? sort.field}</option>}
        {sortable.map(c => <option key={c.field} value={sortKey(c)}>{c.headerName}</option>)}
      </TextField>
      <Button size="small" variant="outlined" aria-label={sort.direction === 'asc' ? L.ascending : L.descending}
        onClick={() => onChange({ field: sort.field, direction: sort.direction === 'asc' ? 'desc' : 'asc' })}>{sort.direction === 'asc' ? '↑' : '↓'}</Button>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Card list
// ---------------------------------------------------------------------------

export interface MjCardListProps {
  config: MjGridConfig
  columns: MjColumn[]
  rows: MjRow[]
  mobile: MjMobileState
  /** inline mode: the column renders its editor */
  renderCell: (column: MjColumn, row: MjRow) => ReactNode
  /** true when the column renders an editor for this row */
  isEditing: (column: MjColumn) => boolean
  selected: string | null
  onRowClick: (row: MjRow) => void
  clickable: boolean
  rowActions?: { add: (row: MjRow) => void; remove: (row: MjRow) => void; addLabel: string; removeLabel: string }
  loading: boolean
  emptyText: string
  footer?: ReactNode
}

/** Splits columns into title / always-visible / collapsible, honouring mobileRole and hideOnMobile. */
export function cardLayout(columns: MjColumn[], cardFields: number) {
  const shown = columns.filter(c => !c.hideOnMobile)
  const title = shown.find(c => c.mobileRole === 'title') ?? shown.find(c => c.type !== 'button' && c.type !== 'image' && c.type !== 'file') ?? shown[0]
  const rest = shown.filter(c => c !== title)
  const buttons = rest.filter(c => c.type === 'button')
  const fields = rest.filter(c => c.type !== 'button')
  const pinned = fields.filter(c => c.mobileRole === 'always')
  const others = fields.filter(c => c.mobileRole !== 'always')
  const head = [...pinned, ...others.slice(0, Math.max(0, cardFields - pinned.length))]
  const tail = others.slice(Math.max(0, cardFields - pinned.length))
  return { title, head, tail, buttons }
}

function CardField({ column, children, wide, editing }: { column: MjColumn; children: ReactNode; wide: boolean; editing?: boolean }) {
  return (
    <Box sx={{ gridColumn: wide ? '1 / -1' : undefined, minWidth: 0 }} role={editing ? 'group' : undefined} aria-label={editing ? column.headerName : undefined}>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.2 }}>{column.headerName}</Typography>
      <Box sx={{ fontSize: 14, wordBreak: 'break-word', '& .MuiTypography-root': { fontSize: 14 }, ...(capabilitiesOf(column).align === 'right' ? { '& > div': { textAlign: 'left' } } : {}) }}>{children}</Box>
    </Box>
  )
}

function RowCard({ row, layout, p }: { row: MjRow; layout: ReturnType<typeof cardLayout>; p: MjCardListProps }) {
  const { labels: L } = useMj()
  const [expanded, setExpanded] = useState(false)
  const isSelected = p.selected === row.id
  const editingAny = layout.tail.some(p.isEditing)
  // inline mode: editors must never hide behind "more"
  const visibleTail = expanded || editingAny ? layout.tail : []
  const tailHidden = layout.tail.length - visibleTail.length
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <Card variant="outlined" data-testid="mj-card" aria-selected={isSelected || undefined} onClick={() => p.clickable && p.onRowClick(row)}
      sx={{ flexShrink: 0, borderColor: isSelected ? 'primary.main' : undefined, borderWidth: isSelected ? 2 : 1, cursor: p.clickable ? 'pointer' : 'default', opacity: row.__state === 'delete' ? 0.5 : 1 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 15, '& .MuiTypography-root': { fontWeight: 600, fontSize: 15 } }}>
            {layout.title ? (p.isEditing(layout.title) ? <CardField column={layout.title} wide editing>{p.renderCell(layout.title, row)}</CardField> : p.renderCell(layout.title, row)) : null}
          </Box>
          {isSelected && <Typography variant="caption" color="primary">{L.selectedRow}</Typography>}
          {p.rowActions && (
            <Box sx={{ display: 'flex', flexShrink: 0 }} onClick={stop}>
              <IconButton size="small" aria-label={p.rowActions.addLabel} onClick={() => p.rowActions!.add(row)}>＋</IconButton>
              <IconButton size="small" aria-label={p.rowActions.removeLabel} onClick={() => p.rowActions!.remove(row)}>－</IconButton>
            </Box>
          )}
        </Box>
        {(layout.head.length > 0 || visibleTail.length > 0) && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {[...layout.head, ...visibleTail].map(c => <CardField key={c.field} column={c} editing={p.isEditing(c)} wide={p.isEditing(c) || c.type === 'image' || c.type === 'custom' || c.type === 'selectGrid' || c.type === 'weekDays'}>{p.renderCell(c, row)}</CardField>)}
          </Box>
        )}
        {(layout.buttons.length > 0 || layout.tail.length > 0) && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }} onClick={stop}>
            {layout.buttons.map(c => <Box key={c.field}>{p.renderCell(c, row)}</Box>)}
            {layout.tail.length > 0 && !editingAny && (
              <Button size="small" sx={{ ml: 'auto' }} onClick={() => setExpanded(x => !x)}>{expanded ? L.less : `${L.more} (${tailHidden})`}</Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export function MjCardList(p: MjCardListProps) {
  const layout = useMemo(() => cardLayout(p.columns, p.mobile.cardFields), [p.columns, p.mobile.cardFields])
  return (
    <Box sx={{ flex: 1, overflow: 'auto', px: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, WebkitOverflowScrolling: 'touch', ...touchSx }} data-testid="mj-cards">
      {p.rows.map(r => <RowCard key={r.id} row={r} layout={layout} p={p} />)}
      {p.rows.length === 0 && !p.loading && <Typography align="center" color="text.secondary" sx={{ py: 6 }}>{p.emptyText}</Typography>}
      {p.footer}
    </Box>
  )
}

/** Compact footer for the card list: one label/value line per column that has footerText. */
export function MjCardFooter({ columns, rows }: { columns: MjColumn[]; rows: MjRow[] }) {
  const items = columns.filter(c => c.footerText !== undefined)
  if (items.length === 0) return null
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, px: 1, pt: 1, fontWeight: 600, fontSize: 14 }} data-testid="mj-card-footer">
      {items.map(c => <span key={c.field}>{c.headerName}: {typeof c.footerText === 'function' ? c.footerText(rows) : c.footerText}</span>)}
    </Box>
  )
}

/** Options for a mobile overflow menu built from the toolbar's secondary actions. */
export const menuItem = (key: string, label: string, onClick: () => void, disabled?: boolean) => <MenuItem key={key} onClick={onClick} disabled={disabled}>{label}</MenuItem>
