import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { MjForm, MjGrid, resolvePendingUploads } from '../../src/mui'
import { MjProvider, type MjFile, type MjGridConfig, type MjToast } from '../../src/core'
import { fakeApi } from '../core/react/fakeApi'
import { makeWrapper } from '../core/react/wrapper'

beforeAll(() => {
  vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:preview', revokeObjectURL: () => {} })
  // jsdom has no canvas; give the signature pad just enough to draw and export
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ lineWidth: 0, lineCap: '', beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, clearRect() {}, drawImage() {} })) as never
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) { cb(new Blob(['png'], { type: 'image/png' })) }
})

const config: MjGridConfig = {
  name: '증명서', resource: '/api/certs',
  columns: [
    { field: 'title', headerName: '제목', type: 'string', editable: true },
    { field: 'doc', headerName: '첨부', type: 'file', editable: true, params: { storageType: 'HACCP', accept: { 'application/pdf': ['.pdf'] }, maxSize: 1000 } },
    { field: 'photo', headerName: '사진', type: 'image', editable: true, params: { signFeature: true, storageType: 'SIGN' } },
    { field: 'owner', headerName: '담당', type: 'profile', editable: true, params: { profileField: 'ownerPhoto' } }
  ]
}
const toast = (): MjToast & { ok: string[]; bad: string[] } => { const t = { ok: [] as string[], bad: [] as string[], success: (m: string) => t.ok.push(m), error: (m: string) => t.bad.push(m) }; return t }
const stored = (n: string): MjFile => ({ id: `f-${n}`, originalName: n, savedName: `saved-${n}`, type: 'FILE', thumbnailPath: `/storages/s_${n}` })

describe('file fields', () => {
  it('stages the file, uploads on submit with the legacy multipart contract, then POSTs the stored file', async () => {
    const f = fakeApi()
    f.on('UPLOAD', '/api/file/upload', { status: 200, data: stored('a.pdf') })
    f.on('POST', '/api/certs', { status: 200, data: {} })
    const closed: boolean[] = []
    render(<MjForm config={config} mode="insert" onClose={c => closed.push(c)} />, { wrapper: makeWrapper(f.api, toast()) })
    const input = screen.getAllByTestId('mj-file-input')[0]!
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'a.pdf', { type: 'application/pdf' })] } })
    expect(await screen.findByText(/a\.pdf/)).toBeInTheDocument()
    expect(f.calls).toHaveLength(0) // nothing uploaded yet
    fireEvent.click(screen.getByText('등록'))
    await waitFor(() => expect(closed).toEqual([true]))
    expect(f.calls.map(c => c.method)).toEqual(['UPLOAD', 'POST'])
    const body = f.calls[1]!.body as Record<string, unknown>
    expect(body.doc).toEqual(stored('a.pdf'))
    expect(JSON.stringify(body)).not.toContain('"file"')
  })

  it('rejects wrong extension and oversize files with a toast and no state change', async () => {
    const f = fakeApi(); const t = toast()
    render(<MjForm config={config} mode="insert" onClose={() => {}} />, { wrapper: makeWrapper(f.api, t) })
    const input = screen.getAllByTestId('mj-file-input')[0]!
    fireEvent.change(input, { target: { files: [new File(['x'], 'evil.exe')] } })
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(2000)], 'big.pdf')] } })
    expect(t.bad).toHaveLength(2)
    expect(t.bad[0]).toMatch(/확장자/)
    expect(t.bad[1]).toMatch(/최대/)
    expect(screen.queryByText(/evil|big/)).not.toBeInTheDocument()
  })

  it('image with signFeature: drawing tab exports a PNG flagged isDraw and it uploads with isDraw=true', async () => {
    const f = fakeApi()
    const seen: FormData[] = []
    f.api.upload = (async (_url: string, form: FormData) => { seen.push(form); return { status: 200, data: stored('sig.png') } }) as typeof f.api.upload
    f.on('POST', '/api/certs', { status: 200, data: {} })
    const closed: boolean[] = []
    render(<MjForm config={config} mode="insert" onClose={c => closed.push(c)} />, { wrapper: makeWrapper(f.api, toast()) })
    fireEvent.click(screen.getByRole('tab', { name: '서명' }))
    const pad = screen.getByTestId('mj-signature')
    fireEvent.pointerDown(pad, { clientX: 10, clientY: 10 }); fireEvent.pointerMove(pad, { clientX: 50, clientY: 50 }); fireEvent.pointerUp(pad)
    fireEvent.click(within(pad.parentElement!).getByText('등록'))
    fireEvent.click(screen.getAllByText('등록').at(-1)!)
    await waitFor(() => expect(closed).toEqual([true]))
    expect(seen).toHaveLength(1)
    expect(seen[0]!.get('isDraw')).toBe('true')
    expect(seen[0]!.get('type')).toBe('SIGN')
    expect((seen[0]!.get('file') as File).name).toMatch(/signature-.*\.png/)
  })

  it('profile writes to params.profileField, not the column field', async () => {
    const f = fakeApi(); f.on('UPLOAD', '/api/file/upload', { status: 200, data: stored('me.jpg') }); f.on('PUT', '/api/certs/', { status: 200, data: {} })
    render(<MjForm config={config} mode="update" row={{ id: 'c1', title: 't', owner: '홍길동' }} onClose={() => {}} />, { wrapper: makeWrapper(f.api, toast()) })
    const input = screen.getAllByTestId('mj-file-input').at(-1)!
    fireEvent.change(input, { target: { files: [new File(['img'], 'me.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByText('수정'))
    await waitFor(() => expect(f.calls.some(c => c.method === 'PUT')).toBe(true))
    const body = f.calls.find(c => c.method === 'PUT')!.body as Record<string, unknown>
    expect(body.ownerPhoto).toEqual(stored('me.jpg'))
    expect(body.owner).toBe('홍길동')
  })

  it('an upload failure keeps the form open and reports the error', async () => {
    const f = fakeApi(); f.on('UPLOAD', '/api/file/upload', { status: 200, error: 'disk full' }); const t = toast()
    const closed: boolean[] = []
    render(<MjForm config={config} mode="insert" onClose={c => closed.push(c)} />, { wrapper: makeWrapper(f.api, t) })
    fireEvent.change(screen.getAllByTestId('mj-file-input')[0]!, { target: { files: [new File(['%PDF'], 'a.pdf')] } })
    fireEvent.click(screen.getByText('등록'))
    await waitFor(() => expect(t.bad).toEqual(['disk full']))
    expect(closed).toEqual([])
    expect(f.calls.filter(c => c.method === 'POST')).toHaveLength(0)
  })

  it('cells: file links use the provider downloadUrl; image/profile thumbnails use imageUrl', async () => {
    const f = fakeApi(); f.on('POST', '/api/certs/serverSide', { status: 200, data: { content: [{ id: '1', title: 't', doc: stored('a.pdf'), photo: stored('p.png'), owner: '홍', ownerPhoto: stored('o.png') }], totalElements: 1 } })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MjProvider api={f.api} queryClient={qc} files={{ downloadUrl: x => `/dl/${x.savedName}`, imageUrl: p => `https://cdn${p}` }}>
        <MjGrid config={{ ...config, editMode: 'readonly' }} />
      </MjProvider>
    )
    const link = await screen.findByText('a.pdf')
    expect(link).toHaveAttribute('href', '/dl/saved-a.pdf')
    expect(screen.getByAltText('p.png')).toHaveAttribute('src', 'https://cdn/storages/s_p.png')
    expect(screen.getByText('홍')).toBeInTheDocument()
  })
})

describe('resolvePendingUploads', () => {
  it('uploads only staged files and leaves stored ones alone', async () => {
    const calls: string[] = []
    const upload = async (file: File, o: { storageType?: string }) => { calls.push(`${file.name}:${o.storageType}`); return stored(file.name) }
    const out = await resolvePendingUploads(config.columns, { doc: { id: 'x', originalName: 'n.pdf', type: 'HACCP', file: new File(['1'], 'n.pdf') }, photo: stored('kept.png') }, upload)
    expect(calls).toEqual(['n.pdf:HACCP'])
    expect(out.doc).toEqual(stored('n.pdf'))
    expect(out.photo).toEqual(stored('kept.png'))
  })
})
