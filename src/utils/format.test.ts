import { describe, expect, it } from 'vitest'
import { formatRupiah, parseAmount, safeAmount, formatAmountInput } from './format'
import { localDate, monthRange, weekRange, displayDate } from './date'
import { validateImage, MAX_IMAGE_SIZE } from './image'

describe('Rupiah integer arithmetic and inputs', () => {
  it('formats without decimals and parses mobile money input', () => {
    expect(formatRupiah(45000)).toBe('Rp45.000')
    expect(parseAmount('50.000')).toBe(50000)
    expect(formatAmountInput('000125000')).toBe('125.000')
  })
  it('rejects zero, fractional and unsafe persisted amounts', () => {
    expect(() => parseAmount('0')).toThrow()
    expect(() => safeAmount(1.5)).toThrow()
    expect(() => safeAmount('9007199254740992')).toThrow()
    expect(() => parseAmount('9999999999999999')).toThrow()
    expect(safeAmount('9007199254740991')).toBe(Number.MAX_SAFE_INTEGER)
  })
})
describe('local calendar ranges', () => {
  it('does not shift a local date through UTC', () => {
    expect(localDate(new Date(2026, 9, 3, 0, 1))).toBe('2026-10-03')
    expect(displayDate('2026-10-03')).toContain('3 Oktober 2026')
  })
  it('handles leap years, December and Monday based weeks', () => {
    expect(monthRange(2, 2028)).toEqual({ start: '2028-02-01', end: '2028-02-29' })
    expect(monthRange(12, 2026)).toEqual({ start: '2026-12-01', end: '2026-12-31' })
    expect(monthRange(2, 4)).toEqual({ start: '0004-02-01', end: '0004-02-29' })
    expect(weekRange(new Date(2026, 9, 4))).toEqual({ start: '2026-09-28', end: '2026-10-04' })
  })
})
describe('receipt validation before allocating canvas memory', () => {
  it('rejects unsupported, oversized and empty files', () => {
    expect(() => validateImage({ type: 'image/svg+xml', size: 100 } as File)).toThrow('JPG')
    expect(() => validateImage({ type: 'image/jpeg', size: MAX_IMAGE_SIZE + 1 } as File)).toThrow('15 MB')
    expect(() => validateImage({ type: 'image/png', size: 0 } as File)).toThrow('kosong')
    expect(() => validateImage({ type: 'image/webp', size: 3000 } as File)).not.toThrow()
  })
})
