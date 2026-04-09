/**
 * Road & Rail data service.
 *
 * Uses BTS ArcGIS FeatureServer for US highway/rail data (fast, no rate limits).
 * Overpass API is no longer used for road/rail — only for infrastructure sites.
 */

import { fetchBTSHighways, fetchBTSRailLines, fetchBTSRailYards } from './btsService.ts'

// ---------------------------------------------------------------------------
// Types (kept for backward compatibility — consumed by stores, layers, etc.)
// ---------------------------------------------------------------------------

export interface RoadSegment {
  id: string
  type: 'interstate' | 'highway' | 'trunk'
  geometry: GeoJSON.LineString
  ref: string
  lengthKm: number
}

export interface RailSegment {
  id: string
  type: 'railroad' | 'rail_yard'
  geometry: GeoJSON.LineString | GeoJSON.Point
  operator: string
  lengthKm: number
}

interface OSMLoadResult {
  interstateCount: number
  highwayCount: number
  railroadCount: number
  yardCount: number
  totalRoadKm: number
  totalRailKm: number
  skippedCount: number
  failedChunks: number
  roadSegments: RoadSegment[]
  railSegments: RailSegment[]
}

// ---------------------------------------------------------------------------
// Loading time estimate
// ---------------------------------------------------------------------------

/**
 * Estimate total loading time for road/rail + infrastructure.
 * BTS is fast (3 parallel queries, 2-10s each).
 * Infrastructure still uses Overpass (~30s).
 */
export function estimateLoadingTime(_bbox: [number, number, number, number]): {
  chunks: number
  queries: number
  estimatedSeconds: number
  estimatedLabel: string
} {
  return {
    chunks: 1,
    queries: 4, // 3 BTS (highways, rail lines, rail yards) + 1 Overpass (infra)
    estimatedSeconds: 40,
    estimatedLabel: '~40s',
  }
}

// ---------------------------------------------------------------------------
// Main loader — BTS parallel fetch
// ---------------------------------------------------------------------------

/**
 * Load road and rail data for a territory bbox using BTS FeatureServer.
 *
 * @param bbox Territory bbox in GeoJSON order: `[west, south, east, north]`.
 * @param onRoadProgress Callback with 0-100 progress for road loading.
 * @param onRailProgress Callback with 0-100 progress for rail loading.
 */
export async function loadOSMData(
  bbox: [number, number, number, number],
  onRoadProgress: (progress: number) => void,
  onRailProgress: (progress: number) => void,
): Promise<OSMLoadResult> {
  let interstateCount = 0
  let highwayCount = 0
  let railroadCount = 0
  let yardCount = 0
  let totalRoadKm = 0
  let totalRailKm = 0
  let skippedCount = 0
  const roadSegments: RoadSegment[] = []
  const railSegments: RailSegment[] = []

  let roadsFailed = false
  let railLinesFailed = false

  // BTS: 3 parallel queries — no rate limits, no chunking needed
  const [roadResult, railLineResult, railYardResult] = await Promise.allSettled([
    fetchBTSHighways(bbox, (count) => {
      onRoadProgress(Math.min(90, Math.round(count / 20)))
    }),
    fetchBTSRailLines(bbox, (count) => {
      onRailProgress(Math.min(80, Math.round(count / 30)))
    }),
    fetchBTSRailYards(bbox),
  ])

  // Process roads
  if (roadResult.status === 'fulfilled') {
    for (const seg of roadResult.value) {
      roadSegments.push(seg)
      totalRoadKm += seg.lengthKm
      if (seg.type === 'interstate') interstateCount++
      else highwayCount++
    }
  } else {
    roadsFailed = true
    skippedCount++
    console.warn('BTS highway fetch failed:', roadResult.reason)
  }
  onRoadProgress(100)

  // Process rail lines
  if (railLineResult.status === 'fulfilled') {
    for (const seg of railLineResult.value) {
      railSegments.push(seg)
      railroadCount++
      totalRailKm += seg.lengthKm
    }
  } else {
    railLinesFailed = true
    skippedCount++
    console.warn('BTS rail lines fetch failed:', railLineResult.reason)
  }

  // Process rail yards
  if (railYardResult.status === 'fulfilled') {
    for (const seg of railYardResult.value) {
      railSegments.push(seg)
      yardCount++
    }
  } else {
    skippedCount++
    console.warn('BTS rail yards fetch failed:', railYardResult.reason)
  }
  onRailProgress(100)

  const failedChunks = (roadsFailed ? 1 : 0) + (railLinesFailed ? 1 : 0)

  return {
    interstateCount,
    highwayCount,
    railroadCount,
    yardCount,
    totalRoadKm: Math.round(totalRoadKm),
    totalRailKm: Math.round(totalRailKm),
    skippedCount,
    failedChunks,
    roadSegments,
    railSegments,
  }
}
