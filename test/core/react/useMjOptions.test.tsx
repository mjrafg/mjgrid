import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMjOptions } from '../../../src/core'
import { fakeApi } from './fakeApi'
import { makeWrapper } from './wrapper'

describe('useMjOptions', () => {
  it('two consumers of the same url share ONE request (legacy: 6 for one table)', async () => {
    const f = fakeApi(); f.on('GET', '/api/product/unit', { status: 200, data: [{ id: 'u1', name: 'Kg' }, { id: 'u2', name: 'EA' }] })
    const wrapper = makeWrapper(f.api)
    const src = { fetchUrl: '/api/product/unit' } as const
    const { result: a } = renderHook(() => useMjOptions(src), { wrapper })
    const { result: b } = renderHook(() => useMjOptions(src), { wrapper })
    await waitFor(() => expect(a.current.options).toHaveLength(2))
    await waitFor(() => expect(b.current.options).toHaveLength(2))
    // separate QueryClients per makeWrapper call would defeat this; same wrapper instance shares the client
    expect(f.count('GET', '/api/product/unit')).toBe(1)
    expect(a.current.options[0]).toMatchObject({ value: 'u1', text: 'Kg' })
  })

  it('honours valueField/textField and keeps the source row in data', async () => {
    const f = fakeApi(); f.on('GET', '/api/x', { status: 200, data: [{ code: 'A', label: 'Alpha', extra: 1 }] })
    const { result } = renderHook(() => useMjOptions({ fetchUrl: '/api/x', valueField: 'code', textField: 'label' }), { wrapper: makeWrapper(f.api) })
    await waitFor(() => expect(result.current.options).toHaveLength(1))
    expect(result.current.options[0]).toEqual({ value: 'A', text: 'Alpha', data: { code: 'A', label: 'Alpha', extra: 1 } })
  })

  it('static options need no request; undefined source is empty', () => {
    const f = fakeApi()
    const { result } = renderHook(() => useMjOptions({ options: [{ value: 1, text: 'one' }] }), { wrapper: makeWrapper(f.api) })
    expect(result.current.options).toEqual([{ value: 1, text: 'one' }])
    const { result: none } = renderHook(() => useMjOptions(undefined), { wrapper: makeWrapper(f.api) })
    expect(none.current.options).toEqual([])
    expect(f.calls).toHaveLength(0)
  })
})
