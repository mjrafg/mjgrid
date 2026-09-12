import dayjs from 'dayjs'
import type { MjGridConfig, MjLabels, MjRow } from '../core'
import { displayValue, escapeHtml, readCell } from './value'

/** Builds the print document. Every cell value is escaped - the legacy printer injected raw values into document.write. */
export function buildPrintHtml(config: MjGridConfig, rows: MjRow[], labels?: Pick<MjLabels, 'positive' | 'negative'>): string {
  const cols = config.columns.filter(c => !c.hideOnPrint && !c.formOnly && c.type !== 'button')
  const head = cols.map(c => `<th>${escapeHtml(c.headerName)}</th>`).join('')
  const body = rows.map((row, i) => {
    const rc = typeof config.printColor === 'function' ? config.printColor(row) : config.printColor
    const tds = cols.map(c => {
      const raw = readCell(c, row)
      const text = c.printFormat ? c.printFormat(raw, row) : displayValue(c, raw, row, labels)
      const cc = typeof c.printColor === 'function' ? c.printColor(raw, row) : c.printColor
      const align = c.type === 'number' ? 'right' : 'left'
      return `<td style="text-align:${align}${cc ? `;color:${escapeHtml(cc)}` : ''}">${escapeHtml(text)}</td>`
    }).join('')
    return `<tr style="background:${i % 2 ? '#f9f9f9' : '#fff'}${rc ? `;color:${escapeHtml(rc)}` : ''}">${tds}</tr>`
  }).join('')
  const title = escapeHtml(`${config.name}-${dayjs().format('YYYYMMDDHHmmss')}`)
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:8px;border:1px solid #ddd}th{background:#f4f4f4;text-align:left}</style></head>
<body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<script>window.onload=function(){window.print()};window.onafterprint=function(){window.close()}</script></body></html>`
}

export function openPrintWindow(html: string): void {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) { console.error('print window blocked'); return }
  w.document.open(); w.document.write(html); w.document.close()
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
