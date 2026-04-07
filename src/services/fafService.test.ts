import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadFAFData, getByCommod, estimatePeakDaily, fetchFreightFlows } from './fafService'
import type { Territory } from '@/types/index.ts'

const seUsaTerritory: Territory = {
  id: 'us-southeast',
  name: 'US Southeast',
  type: 'megaregion',
  boundary: { type: 'Polygon', coordinates: [] },
  bbox: [-91.66, 24.52, -75.46, 36.59],
}

const otherTerritory: Territory = {
  id: 'us-northeast',
  name: 'US Northeast',
  type: 'megaregion',
  boundary: { type: 'Polygon', coordinates: [] },
  bbox: [-80.52, 38.79, -66.95, 47.46],
}

describe('fafService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const sampleRecords = [
    { originFips: '13001', destFips: '13002', commodity: 'Mixed Freight', annualTons: 50000, mode: 'Truck' },
    { originFips: '13003', destFips: '13004', commodity: 'Food Products', annualTons: 75000, mode: 'Rail' },
    { originFips: '13005', destFips: '13006', commodity: 'Mixed Freight', annualTons: 30000, mode: 'Truck' },
  ]

  it('returns parsed data on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleRecords),
    }))

    const onProgress = vi.fn()
    const result = await loadFAFData(onProgress, seUsaTerritory)

    expect(result.records).toHaveLength(3)
    expect(result.totalTonnage).toBe(155000)
    expect(result.countyPairCount).toBe(3)
    expect(result.commodityTypes).toContain('Mixed Freight')
    expect(result.commodityTypes).toContain('Food Products')
    expect(result.skippedCount).toBe(0)
    expect(result.isOfflineFallback).toBe(false)
  })

  it('calls progress callback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleRecords),
    }))

    const onProgress = vi.fn()
    await loadFAFData(onProgress, seUsaTerritory)

    expect(onProgress).toHaveBeenCalled()
    // Last call should be 100
    expect(onProgress).toHaveBeenLastCalledWith(100)
  })

  it('throws on fetch failure when no fallback available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    }))

    const onProgress = vi.fn()
    await expect(loadFAFData(onProgress, seUsaTerritory)).rejects.toThrow(
      'Failed to load FAF freight data'
    )
  })

  it('filters out records with invalid shape', async () => {
    const mixedRecords = [
      { originFips: '13001', destFips: '13002', commodity: 'Mixed Freight', annualTons: 50000, mode: 'Truck' },
      { originFips: 123, destFips: '13004', commodity: 'Food Products', annualTons: 75000, mode: 'Rail' }, // invalid originFips type
      { originFips: '13005', destFips: '13006', commodity: 'Electronics', annualTons: 'bad', mode: 'Truck' }, // invalid annualTons
    ]

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mixedRecords),
    }))

    const onProgress = vi.fn()
    const result = await loadFAFData(onProgress, seUsaTerritory)

    expect(result.records).toHaveLength(1)
    expect(result.records[0].commodity).toBe('Mixed Freight')
    expect(result.skippedCount).toBe(2)
  })

  it('returns correct shape for empty dataset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }))

    const onProgress = vi.fn()
    const result = await loadFAFData(onProgress, seUsaTerritory)

    expect(result.records).toEqual([])
    expect(result.totalTonnage).toBe(0)
    expect(result.countyPairCount).toBe(0)
    expect(result.commodityTypes).toEqual([])
  })

  it('filters out non-palletizable commodities', async () => {
    const recordsWithBulk = [
      { originFips: '13001', destFips: '13002', commodity: 'Mixed Freight', annualTons: 50000, mode: 'Truck' },
      { originFips: '13003', destFips: '13004', commodity: 'Coal', annualTons: 200000, mode: 'Rail' },
      { originFips: '13005', destFips: '13006', commodity: 'Petroleum', annualTons: 300000, mode: 'Pipeline' },
      { originFips: '13007', destFips: '13008', commodity: 'Natural Gas', annualTons: 150000, mode: 'Pipeline' },
      { originFips: '13009', destFips: '13010', commodity: 'Electronics', annualTons: 40000, mode: 'Truck' },
    ]

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(recordsWithBulk),
    }))

    const onProgress = vi.fn()
    const result = await loadFAFData(onProgress, seUsaTerritory)

    expect(result.records).toHaveLength(2)
    expect(result.commodityTypes).toContain('Mixed Freight')
    expect(result.commodityTypes).toContain('Electronics')
    expect(result.commodityTypes).not.toContain('Coal')
    expect(result.commodityTypes).not.toContain('Petroleum')
  })

  it('returns empty for non-SE-USA territory', async () => {
    const onProgress = vi.fn()
    const result = await loadFAFData(onProgress, otherTerritory)

    expect(result.records).toEqual([])
    expect(result.countyPairCount).toBe(0)
    expect(onProgress).toHaveBeenCalledWith(100)
  })

  it('works without territory argument (backward compat)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleRecords),
    }))

    const onProgress = vi.fn()
    const result = await loadFAFData(onProgress)

    expect(result.records).toHaveLength(3)
  })

  describe('getByCommod', () => {
    it('aggregates tonnage by commodity', () => {
      const flows = [
        { originFips: '1', destFips: '2', commodity: 'A', annualTons: 100, mode: 'Truck' },
        { originFips: '3', destFips: '4', commodity: 'B', annualTons: 200, mode: 'Rail' },
        { originFips: '5', destFips: '6', commodity: 'A', annualTons: 150, mode: 'Truck' },
      ]
      const result = getByCommod(flows)
      expect(result).toEqual({ A: 250, B: 200 })
    })
  })

  describe('estimatePeakDaily', () => {
    it('returns 1.5x average daily', () => {
      // 365,000 annual => 1000/day average => 1500 peak
      expect(estimatePeakDaily(365000)).toBe(1500)
    })

    it('returns 0 for 0 annual', () => {
      expect(estimatePeakDaily(0)).toBe(0)
    })
  })

  describe('fetchFreightFlows', () => {
    it('yields records as async generator', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleRecords),
      }))

      const records = []
      for await (const record of fetchFreightFlows(seUsaTerritory)) {
        records.push(record)
      }
      expect(records).toHaveLength(3)
    })

    it('yields nothing for non-SE-USA territory', async () => {
      const records = []
      for await (const record of fetchFreightFlows(otherTerritory)) {
        records.push(record)
      }
      expect(records).toHaveLength(0)
    })
  })
})
