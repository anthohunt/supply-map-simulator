import type { FAFRecord } from '@/types/index.ts'
import type { Territory } from '@/types/index.ts'

/** Commodities excluded from Physical Internet analysis (non-palletizable bulk) */
const NON_PALLETIZABLE = new Set([
  'Coal',
  'Gravel',
  'Natural Gas',
  'Petroleum',
  'Crude Petroleum',
  'Gasoline',
  'Fuel Oils',
  'Natural Sands',
  'Metallic Ores',
  'Nonmetallic Minerals',
  'Waste/Scrap',
])

interface FAFLoadResult {
  records: FAFRecord[]
  totalTonnage: number
  countyPairCount: number
  commodityTypes: string[]
  skippedCount: number
  isOfflineFallback: boolean
}

interface FAFService {
  fetchFreightFlows(territory: Territory): AsyncGenerator<FAFRecord>
  getByCommod(flows: FAFRecord[]): Record<string, number>
  estimatePeakDaily(annualTons: number): number
}

/**
 * Validates a raw record has the correct shape for FAFRecord.
 * Returns true if valid, false if malformed.
 */
function isValidRecord(record: unknown): record is FAFRecord {
  if (record == null || typeof record !== 'object') return false
  const r = record as Record<string, unknown>
  return (
    typeof r.originFips === 'string' &&
    typeof r.destFips === 'string' &&
    typeof r.commodity === 'string' &&
    typeof r.annualTons === 'number' &&
    typeof r.mode === 'string' &&
    !isNaN(r.annualTons as number) &&
    (r.annualTons as number) >= 0
  )
}

/**
 * SE USA bounding box — the region our FAF data covers.
 * Any territory whose bbox overlaps with this region can use FAF data.
 */
const SE_USA_BBOX = { west: -95, south: 24, east: -75, north: 37 }

/**
 * Checks if a territory overlaps with SE USA (the region we have FAF data for).
 * Uses bbox overlap, not exact ID match — so Atlanta Metro, individual SE states, etc. all work.
 */
function isInSEUSA(territory: Territory): boolean {
  const [west, south, east, north] = territory.bbox
  return (
    west < SE_USA_BBOX.east &&
    east > SE_USA_BBOX.west &&
    south < SE_USA_BBOX.north &&
    north > SE_USA_BBOX.south
  )
}

/**
 * Fetches raw JSON from a URL. Throws on network/HTTP errors.
 */
async function fetchJSON(url: string): Promise<unknown[]> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load FAF data: ${response.statusText}`)
  }
  return response.json()
}

/**
 * Load FAF freight data for a territory.
 *
 * For SE USA: loads preprocessed FAF5 county-to-county data from bundled JSON.
 * For other territories: returns empty (no offline data available).
 *
 * Filters out non-palletizable commodities (coal, gravel, petroleum, etc.)
 * per the IPIC 2025 Physical Internet methodology.
 *
 * Malformed records are silently skipped and counted.
 */
export async function loadFAFData(
  onProgress: (progress: number) => void,
  territory?: Territory
): Promise<FAFLoadResult> {
  // For non-SE-USA territories, return empty with appropriate signal
  if (territory && !isInSEUSA(territory)) {
    onProgress(100)
    return {
      records: [],
      totalTonnage: 0,
      countyPairCount: 0,
      commodityTypes: [],
      skippedCount: 0,
      isOfflineFallback: false,
    }
  }

  let rawData: unknown[]
  let isOfflineFallback = false

  // Primary: load the real SE USA dataset
  try {
    onProgress(10)
    rawData = await fetchJSON('/data/faf-se-usa.json')
  } catch {
    // Fallback: try the legacy sample file
    try {
      rawData = await fetchJSON('/data/faf-sample.json')
      isOfflineFallback = true
    } catch (fallbackErr) {
      throw new Error(
        `Failed to load FAF freight data. Check your network connection and try again.`
      )
    }
  }

  onProgress(30)

  // Parse and validate records
  const records: FAFRecord[] = []
  let skippedCount = 0

  for (let i = 0; i < rawData.length; i++) {
    const raw = rawData[i]

    if (!isValidRecord(raw)) {
      skippedCount++
      continue
    }

    // Filter out non-palletizable commodities
    if (NON_PALLETIZABLE.has(raw.commodity)) {
      continue
    }

    records.push(raw)

    // Report progress: 30% for fetch, 70% for parsing
    if (i % 20 === 0 || i === rawData.length - 1) {
      const parseProgress = 30 + Math.round(((i + 1) / rawData.length) * 70)
      onProgress(parseProgress)
    }
  }

  onProgress(100)

  const totalTonnage = records.reduce((sum, r) => sum + r.annualTons, 0)
  const commodityTypes = [...new Set(records.map((r) => r.commodity))]

  return {
    records,
    totalTonnage,
    countyPairCount: records.length,
    commodityTypes,
    skippedCount,
    isOfflineFallback,
  }
}

/**
 * Async generator that yields FAFRecords one at a time for streaming consumption.
 */
export async function* fetchFreightFlows(
  territory: Territory
): AsyncGenerator<FAFRecord> {
  if (!isInSEUSA(territory)) {
    return
  }

  let rawData: unknown[]
  try {
    rawData = await fetchJSON('/data/faf-se-usa.json')
  } catch {
    try {
      rawData = await fetchJSON('/data/faf-sample.json')
    } catch {
      throw new Error(
        'Failed to load FAF freight data. Check your network connection and try again.'
      )
    }
  }

  for (const raw of rawData) {
    if (!isValidRecord(raw)) continue
    if (NON_PALLETIZABLE.has(raw.commodity)) continue
    yield raw
  }
}

/**
 * Aggregate freight flows by commodity type.
 * Returns a map of commodity name to total annual tonnage.
 */
export function getByCommod(flows: FAFRecord[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const flow of flows) {
    result[flow.commodity] = (result[flow.commodity] ?? 0) + flow.annualTons
  }
  return result
}

/**
 * Estimate peak daily tonnage from annual tonnage.
 * Uses the standard freight planning factor: peak day = 1.5x average day.
 * Average day = annual / 365.
 */
export function estimatePeakDaily(annualTons: number): number {
  const averageDaily = annualTons / 365
  const peakFactor = 1.5
  return Math.round(averageDaily * peakFactor)
}

/** Full FAFService object for consumers that prefer the interface pattern */
export const fafService: FAFService = {
  fetchFreightFlows,
  getByCommod,
  estimatePeakDaily,
}
