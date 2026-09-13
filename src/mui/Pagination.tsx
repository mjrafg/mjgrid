import { Box, Pagination as MuiPagination, Typography } from '@mui/material'
import { useMj } from '../core'
import { krds, KrdsTextField } from './krds'

export interface MjPaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  /** KRDS list pattern: 10 / 20 / 50 per page; [] hides the selector */
  pageSizeOptions?: number[]
  onPageSizeChange?: (size: number) => void
  mobile?: boolean
}

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50]

/**
 * components/pagination.md: page-size choice, Primary interaction colours
 * (hover primary-5, current page primary-5 + primary border), 44px targets,
 * aria-current on the current page, result count announced via role=status.
 */
export function MjPagination({ page, pageCount, total, pageSize, onPageChange, pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS, onPageSizeChange, mobile }: MjPaginationProps) {
  const { labels: L } = useMj()
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  const sizes = pageSizeOptions.includes(pageSize) ? pageSizeOptions : [...pageSizeOptions, pageSize].sort((a, b) => a - b)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: mobile ? '8px' : '16px', py: '8px', gap: '8px', flexWrap: 'wrap', fontFamily: krds.font.family, pb: mobile ? 'max(8px, env(safe-area-inset-bottom))' : undefined }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Typography role="status" aria-live="polite" sx={{ fontFamily: krds.font.family, fontSize: krds.fs.bodyS, color: krds.color.textSubtle }}>{from}–{to} / {total}</Typography>
        {onPageSizeChange && sizes.length > 0 && !mobile && (
          <KrdsTextField select size="small" native value={pageSize} aria-label={L.perPage} onChange={e => onPageSizeChange(Number(e.target.value))} sx={{ width: 92 }}>
            {sizes.map(n => <option key={n} value={n}>{n}</option>)}
          </KrdsTextField>
        )}
      </Box>
      <MuiPagination shape="rounded" variant="outlined" count={pageCount} page={page + 1}
        siblingCount={mobile ? 0 : 1} boundaryCount={1}
        onChange={(_, p) => onPageChange(p - 1)}
        sx={{ '& .MuiPaginationItem-root': { minWidth: krds.size.touch, height: krds.size.touch, borderRadius: krds.radius.md, fontFamily: krds.font.family, fontSize: krds.fs.bodyS, color: krds.color.textBasic, borderColor: krds.color.borderGrayLight, borderWidth: krds.borderW,
          '&:hover': { bgcolor: krds.color.actionPrimaryHover }, '&.Mui-selected': { bgcolor: krds.color.actionPrimarySelected, borderColor: krds.color.borderPrimary, color: krds.color.textPrimary, fontWeight: 700, '&:hover': { bgcolor: krds.color.actionPrimaryPressed } },
          '&.Mui-focusVisible': { boxShadow: krds.focusRing } } }} />
    </Box>
  )
}
