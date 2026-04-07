import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadInfrastructureData } from './infrastructureService'
import type { SiteType } from '@/types/index.ts'

describe('infrastructureService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 15 simulated sites', async () => {
    const onProgress = vi.fn()
    const resultPromise = loadInfrastructureData(onProgress)

    // 15 sites * 100ms delay
    await vi.advanceTimersByTimeAsync(15 * 100 + 200)

    const result = await resultPromise
    expect(result.sites).toHaveLength(15)
  })

  it('returns correct counts by type', async () => {
    const resultPromise = loadInfrastructureData(vi.fn())
    await vi.advanceTimersByTimeAsync(15 * 100 + 200)
    const result = await resultPromise

    expect(result.warehouseCount).toBe(3)
    expect(result.terminalCount).toBe(2)
    expect(result.dcCount).toBe(3)
    expect(result.portCount).toBe(3)
    expect(result.airportCount).toBe(2)
    expect(result.railYardCount).toBe(2)
  })

  it('all sites have valid SiteType', async () => {
    const validTypes: SiteType[] = [
      'warehouse',
      'terminal',
      'distribution_center',
      'port',
      'airport',
      'rail_yard',
    ]

    const resultPromise = loadInfrastructureData(vi.fn())
    await vi.advanceTimersByTimeAsync(15 * 100 + 200)
    const result = await resultPromise

    for (const site of result.sites) {
      expect(validTypes).toContain(site.type)
    }
  })

  it('all sites have required properties', async () => {
    const resultPromise = loadInfrastructureData(vi.fn())
    await vi.advanceTimersByTimeAsync(15 * 100 + 200)
    const result = await resultPromise

    for (const site of result.sites) {
      expect(site).toHaveProperty('id')
      expect(site).toHaveProperty('name')
      expect(site).toHaveProperty('type')
      expect(site).toHaveProperty('position')
      expect(site).toHaveProperty('sqft')
      expect(site).toHaveProperty('nearestHighwayKm')
      expect(site).toHaveProperty('nearestRailKm')
      expect(site.position).toHaveLength(2)
      expect(typeof site.sqft).toBe('number')
      expect(site.sqft).toBeGreaterThan(0)
    }
  })

  it('calls progress callback reaching 100', async () => {
    const onProgress = vi.fn()
    const resultPromise = loadInfrastructureData(onProgress)
    await vi.advanceTimersByTimeAsync(15 * 100 + 200)
    await resultPromise

    expect(onProgress).toHaveBeenCalled()
    expect(onProgress).toHaveBeenLastCalledWith(100)
  })

  it('type counts sum to total sites', async () => {
    const resultPromise = loadInfrastructureData(vi.fn())
    await vi.advanceTimersByTimeAsync(15 * 100 + 200)
    const result = await resultPromise

    const totalFromCounts =
      result.warehouseCount +
      result.terminalCount +
      result.dcCount +
      result.portCount +
      result.airportCount +
      result.railYardCount

    expect(totalFromCounts).toBe(result.sites.length)
  })
})
