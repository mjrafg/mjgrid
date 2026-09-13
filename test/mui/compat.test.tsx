import { render, screen } from '@testing-library/react'
import { TextField } from '@mui/material'
import { describe, expect, it } from 'vitest'
import { muiMajor, muiSlotApi, tfSlots, drawerPaper } from '../../src/mui/compat'

/**
 * Runs against whatever MUI is installed (MUI 9 in the lockfile, MUI 5 under
 * scripts/test-matrix.sh) and checks that the spelling matches AND that a real
 * TextField honours it - the whole point is that both majors render the same.
 */
describe('MUI compat layer', () => {
  it('detects the installed major', () => {
    expect(muiMajor).toBeGreaterThanOrEqual(5)
    expect(muiSlotApi).toBe(muiMajor >= 6)
  })

  it('spells TextField slot props for the installed major', () => {
    const p = tfSlots({ html: { readOnly: true }, label: { shrink: true }, select: { native: true } })
    if (muiSlotApi) expect(p).toEqual({ slotProps: { htmlInput: { readOnly: true }, inputLabel: { shrink: true }, select: { native: true } } })
    else expect(p).toEqual({ inputProps: { readOnly: true }, InputLabelProps: { shrink: true }, SelectProps: { native: true } })
    expect(tfSlots({})).toEqual(muiSlotApi ? { slotProps: {} } : {})
  })

  it('a real TextField receives the input attributes through the compat spelling', () => {
    render(<TextField label="x" value="v" onChange={() => {}} {...tfSlots({ html: { readOnly: true, 'aria-label': 'compat-input', inputMode: 'numeric' }, label: { shrink: true } })} />)
    const input = screen.getByLabelText('compat-input') as HTMLInputElement
    expect(input.readOnly).toBe(true)
    expect(input.getAttribute('inputmode')).toBe('numeric')
    expect(document.querySelector('label')?.getAttribute('data-shrink')).toBe('true')
  })

  it('spells the drawer paper slot', () => {
    expect(drawerPaper({ sx: { height: 1 } })).toEqual(muiSlotApi ? { slotProps: { paper: { sx: { height: 1 } } } } : { PaperProps: { sx: { height: 1 } } })
  })
})
