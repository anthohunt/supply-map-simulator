import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadOSMData } from './osmService'

// Mock fetch to avoid real Overpass API calls in tests
const mockFetch = vi.fn()

describe('osmService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Small bbox for testing (a few blocks in New Orleans)
  const testBbox: [number, number, number, number] = [-90.1, 29.9, -90.0, 30.0]

  const jsonHeaders = { get: (key: string) => key === 'content-type' ? 'application/json; charset=utf-8' : null }

  function mockOverpassResponse(elements: unknown[]) {
    return {
      ok: true,
      status: 200,
      headers: jsonHeaders,
      json: () => Promise.resolve({ elements }),
      text: () => Promise.resolve(''),
    }
  }

  it('returns parsed road and rail data from Overpass responses', async () => {
    const roadElements = [
      {
        type: 'way',
        id: 1001,
        tags: { highway: 'motorway', ref: 'I-10' },
        geometry: [
          { lat: 29.95, lon: -90.07 },
          { lat: 29.96, lon: -90.06 },
        ],
      },
      {
        type: 'way',
        id: 1002,
        tags: { highway: 'primary', ref: 'US 90' },
        geometry: [
          { lat: 29.94, lon: -90.08 },
          { lat: 29.95, lon: -90.07 },
        ],
      },
    ]

    const railElements = [
      {
        type: 'way',
        id: 2001,
        tags: { railway: 'rail', operator: 'CSX' },
        geometry: [
          { lat: 29.93, lon: -90.09 },
          { lat: 29.94, lon: -90.08 },
        ],
      },
      {
        type: 'node',
        id: 3001,
        tags: { railway: 'yard', operator: 'NS' },
        lat: 29.95,
        lon: -90.05,
      },
    ]

    // First call = roads query, second call = rail query
    mockFetch
      .mockResolvedValueOnce(mockOverpassResponse(roadElements))
      .mockResolvedValueOnce(mockOverpassResponse(railElements))

    const onRoadProgress = vi.fn()
    const onRailProgress = vi.fn()

    const result = await loadOSMData(testBbox, onRoadProgress, onRailProgress)

    expect(result.interstateCount).toBe(1)
    expect(result.highwayCount).toBe(1)
    expect(result.railroadCount).toBe(1)
    expect(result.yardCount).toBe(1)
    expect(result.totalRoadKm).toBeGreaterThan(0)
    expect(result.totalRailKm).toBeGreaterThan(0)
    expect(result.skippedCount).toBe(0)
  })

  it('calls progress callbacks reaching 100', async () => {
    mockFetch
      .mockResolvedValueOnce(mockOverpassResponse([]))
      .mockResolvedValueOnce(mockOverpassResponse([]))

    const onRoadProgress = vi.fn()
    const onRailProgress = vi.fn()

    await loadOSMData(testBbox, onRoadProgress, onRailProgress)

    expect(onRoadProgress).toHaveBeenLastCalledWith(100)
    expect(onRailProgress).toHaveBeenLastCalledWith(100)
  })

  it('returns data with correct shape', async () => {
    mockFetch
      .mockResolvedValueOnce(mockOverpassResponse([]))
      .mockResolvedValueOnce(mockOverpassResponse([]))

    const result = await loadOSMData(testBbox, vi.fn(), vi.fn())

    expect(result).toHaveProperty('interstateCount')
    expect(result).toHaveProperty('highwayCount')
    expect(result).toHaveProperty('railroadCount')
    expect(result).toHaveProperty('yardCount')
    expect(result).toHaveProperty('totalRoadKm')
    expect(result).toHaveProperty('totalRailKm')
    expect(result).toHaveProperty('skippedCount')
    expect(typeof result.interstateCount).toBe('number')
    expect(typeof result.totalRoadKm).toBe('number')
  })

  it('classifies trunk roads correctly', async () => {
    const roadElements = [
      {
        type: 'way',
        id: 1003,
        tags: { highway: 'trunk', ref: 'US 61' },
        geometry: [
          { lat: 29.95, lon: -90.07 },
          { lat: 29.96, lon: -90.06 },
        ],
      },
    ]

    mockFetch
      .mockResolvedValueOnce(mockOverpassResponse(roadElements))
      .mockResolvedValueOnce(mockOverpassResponse([]))

    const result = await loadOSMData(testBbox, vi.fn(), vi.fn())

    // Trunk roads counted under highwayCount for backward compat
    expect(result.highwayCount).toBe(1)
    expect(result.interstateCount).toBe(0)
  })

  it('throws on persistent API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('Bad request'),
    })

    await expect(
      loadOSMData(testBbox, vi.fn(), vi.fn())
    ).rejects.toThrow('Road data failed')
  })

  it('skips ways with malformed geometry', async () => {
    const roadElements = [
      {
        type: 'way',
        id: 1004,
        tags: { highway: 'motorway', ref: 'I-55' },
        geometry: [{ lat: 29.95, lon: -90.07 }], // Only 1 point — invalid
      },
      {
        type: 'way',
        id: 1005,
        tags: { highway: 'motorway', ref: 'I-20' },
        // No geometry at all
      },
    ]

    mockFetch
      .mockResolvedValueOnce(mockOverpassResponse(roadElements))
      .mockResolvedValueOnce(mockOverpassResponse([]))

    const result = await loadOSMData(testBbox, vi.fn(), vi.fn())

    // Both malformed ways should be skipped
    expect(result.interstateCount).toBe(0)
    expect(result.totalRoadKm).toBe(0)
  })
})
