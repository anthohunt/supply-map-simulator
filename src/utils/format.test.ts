import { describe, it, expect } from 'vitest'
import { formatTonnage, formatDistance, formatPercent, formatCount } from './format'

describe('formatTonnage', () => {
  it('formats zero', () => {
    expect(formatTonnage(0)).toBe('0 tons')
  })

  it('formats small values without suffix', () => {
    expect(formatTonnage(500)).toBe('500 tons')
  })

  it('formats thousands with K suffix', () => {
    expect(formatTonnage(1500)).toBe('1.5K tons')
  })

  it('formats millions with M suffix', () => {
    expect(formatTonnage(2_500_000)).toBe('2.5M tons')
  })

  it('formats billions with B suffix', () => {
    expect(formatTonnage(3_200_000_000)).toBe('3.2B tons')
  })

  it('formats exact thousand boundary', () => {
    expect(formatTonnage(1000)).toBe('1.0K tons')
  })

  it('formats exact million boundary', () => {
    expect(formatTonnage(1_000_000)).toBe('1.0M tons')
  })

  it('formats exact billion boundary', () => {
    expect(formatTonnage(1_000_000_000)).toBe('1.0B tons')
  })
})

describe('formatDistance', () => {
  it('formats small distances with one decimal', () => {
    expect(formatDistance(5.7)).toBe('5.7 km')
  })

  it('formats medium distances as whole numbers', () => {
    expect(formatDistance(142.3)).toBe('142 km')
  })

  it('formats large distances with K suffix', () => {
    expect(formatDistance(1500)).toBe('1.5K km')
  })

  it('handles boundary at 10 km', () => {
    expect(formatDistance(10)).toBe('10 km')
  })

  it('handles boundary at 1000 km', () => {
    expect(formatDistance(1000)).toBe('1.0K km')
  })
})

describe('formatPercent', () => {
  it('formats 0 as 0.0%', () => {
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('formats 1 as 100.0%', () => {
    expect(formatPercent(1)).toBe('100.0%')
  })

  it('formats 0.5 as 50.0%', () => {
    expect(formatPercent(0.5)).toBe('50.0%')
  })

  it('respects custom decimals', () => {
    expect(formatPercent(0.1234, 2)).toBe('12.34%')
  })

  it('handles values over 100%', () => {
    expect(formatPercent(1.5)).toBe('150.0%')
  })
})

describe('formatCount', () => {
  it('formats small numbers without commas', () => {
    expect(formatCount(42)).toBe('42')
  })

  it('formats thousands with commas', () => {
    expect(formatCount(1234)).toBe('1,234')
  })

  it('formats millions with commas', () => {
    expect(formatCount(1_234_567)).toBe('1,234,567')
  })

  it('formats zero', () => {
    expect(formatCount(0)).toBe('0')
  })
})
