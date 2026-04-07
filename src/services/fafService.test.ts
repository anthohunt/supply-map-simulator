import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadFAFData } from './fafService'

describe('fafService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Use fake timers to skip delays
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const sampleRecords = [
    { originFips: '13001', destFips: '13002', commodity: 'Grain', annualTons: 50000, mode: 'Truck' },
    { originFips: '13003', destFips: '13004', commodity: 'Coal', annualTons: 75000, mode: 'Rail' },
    { originFips: '13005', destFips: '13006', commodity: 'Grain', annualTons: 30000, mode: 'Truck' },
  ]

  it('returns parsed data on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleRecords),
    }))

    const onProgress = vi.fn()
    const resultPromise = loadFAFData(onProgress)

    // Advance timers to flush all delays (3 records * 80ms)
    await vi.advanceTimersByTimeAsync(80 * 3 + 100)

    const result = await resultPromise

    expect(result.records).toHaveLength(3)
    expect(result.totalTonnage).toBe(155000)
    expect(result.countyPairCount).toBe(3)
    expect(result.commodityTypes).toContain('Grain')
    expect(result.commodityTypes).toContain('Coal')
  })

  it('calls progress callback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleRecords),
    }))

    const onProgress = vi.fn()
    const resultPromise = loadFAFData(onProgress)

    await vi.advanceTimersByTimeAsync(80 * 3 + 100)
    await resultPromise

    // Progress should have been called for each record
    expect(onProgress).toHaveBeenCalled()
    // Last call should be 100
    expect(onProgress).toHaveBeenLastCalledWith(100)
  })

  it('throws on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    }))

    const onProgress = vi.fn()
    await expect(loadFAFData(onProgress)).rejects.toThrow('Failed to load FAF data: Not Found')
  })

  it('filters out records with invalid shape', async () => {
    const mixedRecords = [
      { originFips: '13001', destFips: '13002', commodity: 'Grain', annualTons: 50000, mode: 'Truck' },
      { originFips: 123, destFips: '13004', commodity: 'Coal', annualTons: 75000, mode: 'Rail' }, // invalid originFips type
      { originFips: '13005', destFips: '13006', commodity: 'Oil', annualTons: 'bad', mode: 'Pipe' }, // invalid annualTons
    ]

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mixedRecords),
    }))

    const onProgress = vi.fn()
    const resultPromise = loadFAFData(onProgress)
    await vi.advanceTimersByTimeAsync(80 * 3 + 100)
    const result = await resultPromise

    // Only the first record passes validation
    expect(result.records).toHaveLength(1)
    expect(result.records[0].commodity).toBe('Grain')
  })

  it('returns correct shape for empty dataset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }))

    const onProgress = vi.fn()
    const result = await loadFAFData(onProgress)

    expect(result.records).toEqual([])
    expect(result.totalTonnage).toBe(0)
    expect(result.countyPairCount).toBe(0)
    expect(result.commodityTypes).toEqual([])
  })
})
