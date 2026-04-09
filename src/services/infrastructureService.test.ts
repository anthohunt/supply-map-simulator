import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadInfrastructureData, deduplicateSites } from './infrastructureService'
import type { CandidateSite, SiteType } from '@/types/index.ts'

// ---------------------------------------------------------------------------
// Mock Overpass response helpers
// ---------------------------------------------------------------------------

function makeOverpassWay(
  id: number,
  tags: Record<string, string>,
  center: { lat: number; lon: number } = { lat: 33.75, lon: -84.39 }
) {
  return {
    type: 'way' as const,
    id,
    tags,
    center,
  }
}

function makeOverpassNode(
  id: number,
  tags: Record<string, string>,
  lat = 33.75,
  lon = -84.39
) {
  return {
    type: 'node' as const,
    id,
    tags,
    lat,
    lon,
  }
}

const jsonHeaders = { get: (key: string) => key === 'content-type' ? 'application/json; charset=utf-8' : null }

function mockFetchSuccess(elements: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    headers: jsonHeaders,
    json: () => Promise.resolve({ elements }),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('infrastructureService', () => {
  const testBbox: [number, number, number, number] = [-85, 32, -83, 35]
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('fetches sites from Overpass and returns correct counts', async () => {
    const elements = [
      makeOverpassWay(1, { building: 'warehouse' }, { lat: 33.75, lon: -84.39 }),
      makeOverpassWay(2, { building: 'warehouse' }, { lat: 34.2, lon: -83.5 }),
      makeOverpassWay(3, { building: 'industrial' }, { lat: 34.0, lon: -84.0 }),
      makeOverpassNode(4, { amenity: 'fuel', hgv: 'yes' }, 33.5, -84.5),
      makeOverpassNode(5, { aeroway: 'aerodrome' }, 34.5, -83.5),
      makeOverpassWay(6, { harbour: 'yes' }, { lat: 32.1, lon: -81.1 }),
      makeOverpassNode(7, { railway: 'yard' }, 36.0, -86.5),
    ]

    globalThis.fetch = mockFetchSuccess(elements)

    const onProgress = vi.fn()
    const result = await loadInfrastructureData(testBbox, onProgress)

    expect(result.sites.length).toBe(7)
    expect(result.warehouseCount).toBe(2)
    expect(result.dcCount).toBe(1)
    expect(result.terminalCount).toBe(1)
    expect(result.airportCount).toBe(1)
    expect(result.portCount).toBe(1)
    expect(result.railYardCount).toBe(1)
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
    const elements = [
      makeOverpassWay(1, { building: 'warehouse' }),
      makeOverpassNode(2, { aeroway: 'aerodrome' }),
      makeOverpassNode(3, { railway: 'yard' }, 34.0, -85.0),
    ]

    globalThis.fetch = mockFetchSuccess(elements)
    const result = await loadInfrastructureData(testBbox, vi.fn())

    for (const site of result.sites) {
      expect(validTypes).toContain(site.type)
    }
  })

  it('all sites have required properties', async () => {
    const elements = [
      makeOverpassWay(1, { building: 'warehouse', name: 'Test Warehouse' }),
      makeOverpassNode(2, { amenity: 'fuel', hgv: 'yes' }),
    ]

    globalThis.fetch = mockFetchSuccess(elements)
    const result = await loadInfrastructureData(testBbox, vi.fn())

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
    globalThis.fetch = mockFetchSuccess([
      makeOverpassWay(1, { building: 'warehouse' }),
    ])

    const onProgress = vi.fn()
    await loadInfrastructureData(testBbox, onProgress)

    expect(onProgress).toHaveBeenCalled()
    expect(onProgress).toHaveBeenLastCalledWith(100)
  })

  it('type counts sum to total sites', async () => {
    const elements = [
      makeOverpassWay(1, { building: 'warehouse' }),
      makeOverpassWay(2, { building: 'industrial' }, { lat: 34.5, lon: -84.0 }),
      makeOverpassNode(3, { amenity: 'fuel', hgv: 'yes' }, 33.0, -83.0),
      makeOverpassNode(4, { aeroway: 'aerodrome' }, 35.0, -84.0),
      makeOverpassWay(5, { harbour: 'yes' }, { lat: 32.0, lon: -82.0 }),
      makeOverpassNode(6, { railway: 'yard' }, 36.0, -85.0),
    ]

    globalThis.fetch = mockFetchSuccess(elements)
    const result = await loadInfrastructureData(testBbox, vi.fn())

    const totalFromCounts =
      result.warehouseCount +
      result.terminalCount +
      result.dcCount +
      result.portCount +
      result.airportCount +
      result.railYardCount

    expect(totalFromCounts).toBe(result.sites.length)
  })

  it('skips elements with unrecognized tags and reports skippedCount', async () => {
    const elements = [
      makeOverpassWay(1, { building: 'warehouse' }),
      makeOverpassWay(2, { building: 'residential' }), // not a logistics type
      makeOverpassNode(3, { amenity: 'restaurant' }), // not a logistics type
    ]

    globalThis.fetch = mockFetchSuccess(elements)
    const result = await loadInfrastructureData(testBbox, vi.fn())

    expect(result.sites.length).toBe(1)
    expect(result.skippedCount).toBe(2)
  })

  it('filters sites below minSqft threshold', async () => {
    // Nodes get DEFAULT_NODE_SQFT = 50,000
    const elements = [
      makeOverpassNode(1, { railway: 'yard' }),
    ]

    globalThis.fetch = mockFetchSuccess(elements)

    // With minSqft = 100,000 the 50k node should be filtered
    const result = await loadInfrastructureData(testBbox, vi.fn(), 100_000)
    expect(result.sites.length).toBe(0)
    expect(result.skippedCount).toBe(1)
  })

  it('reports fewSitesWarning when fewer than 10 sites', async () => {
    const elements = [
      makeOverpassWay(1, { building: 'warehouse' }),
      makeOverpassWay(2, { building: 'warehouse' }, { lat: 34.0, lon: -84.0 }),
    ]

    globalThis.fetch = mockFetchSuccess(elements)
    const result = await loadInfrastructureData(testBbox, vi.fn())

    expect(result.fewSitesWarning).toBe(true)
  })

  it('no fewSitesWarning when 10 or more sites', async () => {
    const elements = Array.from({ length: 12 }, (_, i) =>
      makeOverpassWay(
        i + 1,
        { building: 'warehouse' },
        { lat: 33 + i * 0.1, lon: -84 - i * 0.1 }
      )
    )

    globalThis.fetch = mockFetchSuccess(elements)
    const result = await loadInfrastructureData(testBbox, vi.fn())

    expect(result.fewSitesWarning).toBe(false)
  })

  it('throws on non-retryable HTTP errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad request'),
    })

    await expect(
      loadInfrastructureData(testBbox, vi.fn())
    ).rejects.toThrow('Overpass API error 400')
  })

  it('retries on 429 and eventually succeeds', { timeout: 15_000 }, async () => {
    const elements = [makeOverpassWay(1, { building: 'warehouse' })]
    let callCount = 0

    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Headers(),
        })
      }
      return Promise.resolve({
        ok: true,
        headers: jsonHeaders,
        json: () => Promise.resolve({ elements }),
      })
    })

    const result = await loadInfrastructureData(testBbox, vi.fn())
    expect(result.sites.length).toBe(1)
    expect(callCount).toBe(2)
  })

  it('uses name tag when available', async () => {
    const elements = [
      makeOverpassWay(1, { building: 'warehouse', name: 'Atlanta Hub' }),
    ]

    globalThis.fetch = mockFetchSuccess(elements)
    const result = await loadInfrastructureData(testBbox, vi.fn())

    expect(result.sites[0].name).toBe('Atlanta Hub')
  })

  it('generates fallback name from operator + type when no name tag', async () => {
    const elements = [
      makeOverpassWay(1, { building: 'warehouse', operator: 'Amazon' }),
    ]

    globalThis.fetch = mockFetchSuccess(elements)
    const result = await loadInfrastructureData(testBbox, vi.fn())

    expect(result.sites[0].name).toBe('Amazon Warehouse')
  })
})

// ---------------------------------------------------------------------------
// Deduplication tests
// ---------------------------------------------------------------------------

describe('deduplicateSites', () => {
  function makeSite(
    id: string,
    type: SiteType,
    position: [number, number],
    sqft: number
  ): CandidateSite {
    return {
      id,
      name: `Site ${id}`,
      type,
      position,
      sqft,
      nearestHighwayKm: 0,
      nearestRailKm: 0,
      assignedHubId: null,
    }
  }

  it('removes duplicate same-type sites within radius, keeping the larger', () => {
    const sites = [
      makeSite('a', 'warehouse', [-84.39, 33.75], 100_000),
      makeSite('b', 'warehouse', [-84.3901, 33.7501], 200_000), // ~15 meters away
    ]

    const { sites: result, removedCount } = deduplicateSites(sites, 1)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('b') // larger one kept
    expect(removedCount).toBe(1)
  })

  it('does not deduplicate different types even when close', () => {
    const sites = [
      makeSite('a', 'warehouse', [-84.39, 33.75], 100_000),
      makeSite('b', 'airport', [-84.39, 33.75], 200_000),
    ]

    const { sites: result, removedCount } = deduplicateSites(sites, 1)

    expect(result).toHaveLength(2)
    expect(removedCount).toBe(0)
  })

  it('does not deduplicate sites beyond radius', () => {
    const sites = [
      makeSite('a', 'warehouse', [-84.39, 33.75], 100_000),
      makeSite('b', 'warehouse', [-84.0, 34.0], 200_000), // ~40 km away
    ]

    const { sites: result, removedCount } = deduplicateSites(sites, 1)

    expect(result).toHaveLength(2)
    expect(removedCount).toBe(0)
  })

  it('returns empty array unchanged', () => {
    const { sites, removedCount } = deduplicateSites([], 1)
    expect(sites).toHaveLength(0)
    expect(removedCount).toBe(0)
  })
})
