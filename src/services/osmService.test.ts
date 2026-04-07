import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadOSMData } from './osmService'

describe('osmService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns simulated road/rail data', async () => {
    const onRoadProgress = vi.fn()
    const onRailProgress = vi.fn()

    const resultPromise = loadOSMData(onRoadProgress, onRailProgress)

    // Advance through all road steps (15 * 120ms) + rail steps (10 * 100ms)
    await vi.advanceTimersByTimeAsync(15 * 120 + 10 * 100 + 200)

    const result = await resultPromise

    expect(result.interstateCount).toBe(12)
    expect(result.highwayCount).toBe(47)
    expect(result.railroadCount).toBe(23)
    expect(result.yardCount).toBe(8)
    expect(result.totalRoadKm).toBe(14832)
    expect(result.totalRailKm).toBe(6241)
  })

  it('calls road progress callback reaching 100', async () => {
    const onRoadProgress = vi.fn()
    const onRailProgress = vi.fn()

    const resultPromise = loadOSMData(onRoadProgress, onRailProgress)
    await vi.advanceTimersByTimeAsync(15 * 120 + 10 * 100 + 200)
    await resultPromise

    expect(onRoadProgress).toHaveBeenCalled()
    expect(onRoadProgress).toHaveBeenLastCalledWith(100)
  })

  it('calls rail progress callback reaching 100', async () => {
    const onRoadProgress = vi.fn()
    const onRailProgress = vi.fn()

    const resultPromise = loadOSMData(onRoadProgress, onRailProgress)
    await vi.advanceTimersByTimeAsync(15 * 120 + 10 * 100 + 200)
    await resultPromise

    expect(onRailProgress).toHaveBeenCalled()
    expect(onRailProgress).toHaveBeenLastCalledWith(100)
  })

  it('returns data with correct shape', async () => {
    const resultPromise = loadOSMData(vi.fn(), vi.fn())
    await vi.advanceTimersByTimeAsync(15 * 120 + 10 * 100 + 200)
    const result = await resultPromise

    expect(result).toHaveProperty('interstateCount')
    expect(result).toHaveProperty('highwayCount')
    expect(result).toHaveProperty('railroadCount')
    expect(result).toHaveProperty('yardCount')
    expect(result).toHaveProperty('totalRoadKm')
    expect(result).toHaveProperty('totalRailKm')
    expect(typeof result.interstateCount).toBe('number')
    expect(typeof result.totalRoadKm).toBe('number')
  })
})
