import { describe, expect, it } from 'vitest'
import { buildPrintHtml, escapeHtml } from '../../src/mui'
import type { MjGridConfig } from '../../src/core'

describe('print', () => {
  it('escapes every cell, header and colour so stored data cannot inject markup', () => {
    const cfg: MjGridConfig = {
      name: 'P<script>', printColor: () => '"onload=x',
      columns: [
        { field: 'name', headerName: '이름 <b>', type: 'string', printColor: () => "red'" },
        { field: 'hidden', headerName: 'H', type: 'string', hideOnPrint: true },
        { field: 'btn', headerName: 'B', type: 'button', params: { text: 'x', onClick: () => {} } }
      ]
    }
    const html = buildPrintHtml(cfg, [{ id: '1', name: '<img src=x onerror=alert(1)>', hidden: 'secret' }])
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('이름 &lt;b&gt;')
    expect(html).not.toContain('secret')          // hideOnPrint
    expect(html).not.toContain('<th>B</th>')       // buttons never print
    expect(html).toContain('&quot;onload=x')
    expect(html).toContain("red&#39;")
  })
  it('escapeHtml covers the five significant characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})
