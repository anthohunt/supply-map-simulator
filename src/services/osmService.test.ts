import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadOSMData } from './osmService'

// Mock fetch to avoid real BTS API calls in tests
const mockFetch = vi.fn()

describe('osmService (BTS backend)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const testBbox: [number, number, number, number] = [-90.1, 29.9, -90.0, 30.0]

  function mockBTSResponse(features: unknown[]) {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        type: 'FeatureCollection',
        features,
      }),
    }
  }

  function makeHighwayFeature(id: number, signt: string, sign: string, shapeLenDeg: number) {
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[-90.07, 29.95], [-90.06, 29.96]],
      },
      properties: { OBJECTID: id, SIGNT1: signt, SIGN1: sign, SIGNN1: sign.replace(/\D/g, ''), Shape__Length: shapeLenDeg },
    }
  }

  function makeRailFeature(id: number, owner: string, km: number) {
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[-90.09, 29.93], [-90.08, 29.94]],
      },
      properties: { OBJECTID: id, FRAARCID: id + 1000, RROWNER1: owner, KM: km },
    }
  }

  function makeYardFeature(id: number, name: string, owner: string) {
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[-90.05, 29.95], [-90.04, 29.95]],
      },
      properties: { OBJECTID: id, YARDNAME: name, RROWNER1: owner, RROWNER1_NAME: `${owner} Transportation` },
    }
  }

  it('returns parsed road and rail data from BTS responses', async () => {
    // 3 parallel fetches: highways, rail lines, rail yards
    mockFetch
      .mockResolvedValueOnce(mockBTSResponse([
        makeHighwayFeature(1, 'I', 'I10', 5.2),
        makeHighwayFeature(2, 'U', 'U90', 3.1),
      ]))
      .mockResolvedValueOnce(mockBTSResponse([
        makeRailFeature(1, 'CSX', 2.4),
      ]))
      .mockResolvedValueOnce(mockBTSResponse([
        makeYardFeature(1, 'Gentilly Yard', 'NS'),
      ]))

    const result = await loadOSMData(testBbox, vi.fn(), vi.fn())

    expect(result.interstateCount).toBe(1)
    expect(result.highwayCount).toBe(1)
    expect(result.railroadCount).toBe(1)
    expect(result.yardCount).toBe(1)
    expect(result.totalRoadKm).toBeGreaterThan(0)
    expect(result.totalRailKm).toBe(2)
    expect(result.skippedCount).toBe(0)
    expect(result.failedChunks).toBe(0)
  })

  it('calls progress callbacks reaching 100', async () => {
    mockFetch
      .mockResolvedValueOnce(mockBTSResponse([]))
      .mockResolvedValueOnce(mockBTSResponse([]))
      .mockResolvedValueOnce(mockBTSResponse([]))

    const onRoadProgress = vi.fn()
    const onRailProgress = vi.fn()

    await loadOSMData(testBbox, onRoadProgress, onRailProgress)

    expect(onRoadProgress).toHaveBeenLastCalledWith(100)
    expect(onRailProgress).toHaveBeenLastCalledWith(100)
  })

  it('returns data with correct shape', async () => {
    mockFetch
      .mockResolvedValueOnce(mockBTSResponse([]))
      .mockResolvedValueOnce(mockBTSResponse([]))
      .mockResolvedValueOnce(mockBTSResponse([]))

    const result = await loadOSMData(testBbox, vi.fn(), vi.fn())

    expect(result).toHaveProperty('interstateCount')
    expect(result).toHaveProperty('highwayCount')
    expect(result).toHaveProperty('railroadCount')
    expect(result).toHaveProperty('yardCount')
    expect(result).toHaveProperty('totalRoadKm')
    expect(result).toHaveProperty('totalRailKm')
    expect(result).toHaveProperty('skippedCount')
    expect(result).toHaveProperty('failedChunks')
    expect(typeof result.interstateCount).toBe('number')
    expect(typeof result.totalRoadKm).toBe('number')
  })

  it('classifies US routes as highway type', async () => {
    mockFetch
      .mockResolvedValueOnce(mockBTSResponse([
        makeHighwayFeature(1, 'U', 'U61', 4.0),
      ]))
      .mockResolvedValueOnce(mockBTSResponse([]))
      .mockResolvedValueOnce(mockBTSResponse([]))

    const result = await loadOSMData(testBbox, vi.fn(), vi.fn())

    expect(result.highwayCount).toBe(1)
    expect(result.interstateCount).toBe(0)
  })

  it('gracefully handles BTS API failures without throwing', { timeout: 30_000 }, async () => {
    // All 3 fetches fail
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await loadOSMData(testBbox, vi.fn(), vi.fn())

    // Should NOT throw — returns empty with failedChunks
    expect(result.roadSegments).toEqual([])
    expect(result.railSegments).toEqual([])
    expect(result.failedChunks).toBe(2)
    expect(result.skippedCount).toBe(3)
  })

  it('handles partial failures — roads succeed, rail fails', { timeout: 30_000 }, async () => {
    mockFetch
      .mockResolvedValueOnce(mockBTSResponse([
        makeHighwayFeature(1, 'I', 'I10', 5.0),
      ]))
      .mockRejectedValueOnce(new Error('Rail API down'))
      .mockRejectedValueOnce(new Error('Yards API down'))

    const result = await loadOSMData(testBbox, vi.fn(), vi.fn())

    expect(result.interstateCount).toBe(1)
    expect(result.roadSegments.length).toBe(1)
    expect(result.railroadCount).toBe(0)
    expect(result.failedChunks).toBe(1)
  })

  it('handles BTS error response (200 with error body) — retries then fails', { timeout: 30_000 }, async () => {
    // Route mocks by URL: highways always error, rail/yards succeed
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('NTAD_National_Network')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ error: { code: 400, message: 'Invalid query' } }),
        })
      }
      return Promise.resolve(mockBTSResponse([]))
    })

    const result = await loadOSMData(testBbox, vi.fn(), vi.fn())

    expect(result.roadSegments).toEqual([])
    expect(result.failedChunks).toBe(1)
    expect(result.skippedCount).toBe(1)
  })
})
