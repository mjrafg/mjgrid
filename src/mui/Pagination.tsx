import { Box, Pagination as MuiPagination, Typography } from '@mui/material'

export interface MjPaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  mobile?: boolean
}

export function MjPagination({ page, pageCount, total, pageSize, onPageChange, mobile }: MjPaginationProps) {
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: mobile ? 1 : 2, py: mobile ? 1 : 1.5, gap: mobile ? 1 : 2, flexWrap: 'wrap', pb: mobile ? 'max(8px, env(safe-area-inset-bottom))' : undefined }}>
      <Typography variant="body2" color="text.secondary">{from}–{to} / {total}</Typography>
      <MuiPagination color="primary" shape="rounded" variant="outlined" count={pageCount} page={page + 1}
        siblingCount={mobile ? 0 : 1} boundaryCount={1} size={mobile ? 'medium' : undefined}
        onChange={(_, p) => onPageChange(p - 1)} />
    </Box>
  )
}
