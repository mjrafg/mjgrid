import MuiPagination from '@mui/material/Pagination'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export interface MjPaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function MjPagination({ page, pageCount, total, pageSize, onPageChange }: MjPaginationProps) {
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, gap: 2, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary">{from}–{to} / {total}</Typography>
      <MuiPagination color="primary" shape="rounded" variant="outlined" count={pageCount} page={page + 1}
        onChange={(_, p) => onPageChange(p - 1)} />
    </Box>
  )
}
