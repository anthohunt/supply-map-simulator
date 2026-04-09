/**
 * BTS ArcGIS FeatureServer client for US road/rail data.
 *
 * Free, no API key, no rate limits. Returns GeoJSON directly.
 * Replaces Overpass API for road/rail (which was fragile: 429/403 errors,
 * 5-20 min load times). BTS loads in 5-30 seconds.
 *
 * Data sources:
 * - National Network (highways): SIGNT1 I=Interstate, U=US Route, S=State
 * - North American Rail Network Lines: FRA-sourced, includes owner (NS/CSXT/BNSF/UP)
 * - Rail Yards: yard names and owners
 */

import type { RoadSegment, RailSegment } from './osmService.ts'

const BTS_HIGHWAYS_URL =
  'https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_National_Network/FeatureServer/0/query'
const BTS_RAIL_LINES_URL =
  'https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_North_American_Rail_Network_Lines/FeatureServer/0/query'
const BTS_RAIL_YARDS_URL =
  'https://services.arcgis.com/xOi1kZaI0eWDREZv/ArcGIS/rest/services/NTAD_Rail_Yards/FeatureServer/0/query'

const PAGE_SIZE = 2000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  properties?: { exceededTransferLimit?: boolean }
  features: Array<{
    type: 'Feature'
    geometry: { type: string; coordinates: number[][] | number[][][] | number[] }
    properties: Record<string, unknown>
  }>
}

/**
 * Fetch all features from a BTS ArcGIS FeatureServer endpoint with pagination.
 * Retries on network errors. No rate limits on BTS servers.
 */
async function fetchAllFeatures(
  baseUrl: string,
  where: string,
  bbox: [number, number, number, number],
  outFields: string,
  onProgress?: (fetched: number) => void
): Promise<GeoJSONFeatureCollection['features']> {
  const [west, south, east, north] = bbox
  const allFeatures: GeoJSONFeatureCollection['features'] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      where,
      geometry: `${west},${south},${east},${north}`,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields,
      f: 'geojson',
      resultRecordCount: String(PAGE_SIZE),
      resultOffset: String(offset),
    })

    let data: Record<string, unknown> | null = null
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${baseUrl}?${params}`)
        if (!response.ok) {
          if (attempt === MAX_RETRIES) throw new Error(`BTS API HTTP ${response.status}`)
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
          continue
        }
        data = await response.json()

        // ArcGIS sometimes returns 200 with a JSON error body — retry these
        if (data && (data as { error?: unknown }).error) {
          const err = (data as { error: { message?: string; code?: number } }).error
          if (attempt === MAX_RETRIES) {
            throw new Error(`BTS API query error: ${err.message || err.code || 'unknown'}`)
          }
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
          continue
        }
        break // success
      } catch (e) {
        if (attempt === MAX_RETRIES) throw e instanceof Error ? e : new Error(`BTS API unreachable after ${MAX_RETRIES} retries`)
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
      }
    }

    if (!data || !Array.isArray((data as unknown as GeoJSONFeatureCollection).features)) {
      throw new Error('BTS API returned unexpected response format')
    }

    const fc = data as unknown as GeoJSONFeatureCollection
    allFeatures.push(...fc.features)
    onProgress?.(allFeatures.length)

    if (fc.properties?.exceededTransferLimit && fc.features.length === PAGE_SIZE) {
      offset += PAGE_SIZE
    } else {
      hasMore = false
    }
  }

  return allFeatures
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch US highway segments from BTS National Network.
 * Filters to Interstates (I) and US Routes (U) only.
 */
export async function fetchBTSHighways(
  bbox: [number, number, number, number],
  onProgress?: (fetched: number) => void
): Promise<RoadSegment[]> {
  const features = await fetchAllFeatures(
    BTS_HIGHWAYS_URL,
    "SIGNT1 IN ('I','U')",
    bbox,
    'SIGNT1,SIGN1,SIGNN1,MILES,OBJECTID',
    onProgress
  )

  return features
    .filter((f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')
    .map((f) => {
      const props = f.properties
      const signt = String(props.SIGNT1 ?? '')

      let type: 'interstate' | 'highway' | 'trunk'
      if (signt === 'I') type = 'interstate'
      else if (signt === 'U') type = 'highway'
      else type = 'trunk'

      const coords =
        f.geometry.type === 'MultiLineString'
          ? (f.geometry.coordinates as number[][][])[0]
          : (f.geometry.coordinates as number[][])

      const sign = String(props.SIGN1 ?? '').trim()

      return {
        id: `bts-hw/${props.OBJECTID}`,
        type,
        geometry: { type: 'LineString' as const, coordinates: coords },
        ref: sign || `${signt}${props.SIGNN1 ?? ''}`,
        lengthKm: Number(props.MILES ?? 0) * 1.60934,
      }
    })
}

/**
 * Fetch US rail line segments from BTS North American Rail Network.
 */
export async function fetchBTSRailLines(
  bbox: [number, number, number, number],
  onProgress?: (fetched: number) => void
): Promise<RailSegment[]> {
  const features = await fetchAllFeatures(
    BTS_RAIL_LINES_URL,
    "COUNTRY='US'",
    bbox,
    'RROWNER1,KM,FRAARCID,OBJECTID',
    onProgress
  )

  return features
    .filter((f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')
    .map((f) => {
      const props = f.properties
      const coords =
        f.geometry.type === 'MultiLineString'
          ? (f.geometry.coordinates as number[][][])[0]
          : (f.geometry.coordinates as number[][])

      return {
        id: `bts-rail/${props.FRAARCID ?? props.OBJECTID}`,
        type: 'railroad' as const,
        geometry: { type: 'LineString' as const, coordinates: coords },
        operator: String(props.RROWNER1 ?? ''),
        lengthKm: Number(props.KM ?? 0),
      }
    })
}

/**
 * Fetch US rail yards from BTS Rail Yards dataset.
 */
export async function fetchBTSRailYards(
  bbox: [number, number, number, number],
  onProgress?: (fetched: number) => void
): Promise<RailSegment[]> {
  const features = await fetchAllFeatures(
    BTS_RAIL_YARDS_URL,
    '1=1',
    bbox,
    'YARDNAME,RROWNER1,RROWNER1_NAME,OBJECTID',
    onProgress
  )

  return features.map((f) => {
    const props = f.properties
    // Rail yards can be LineString (track geometry) or Point
    let geom: RailSegment['geometry']
    if (f.geometry.type === 'Point') {
      geom = { type: 'Point', coordinates: f.geometry.coordinates as unknown as [number, number] }
    } else {
      const coords =
        f.geometry.type === 'MultiLineString'
          ? (f.geometry.coordinates as number[][][])[0]
          : (f.geometry.coordinates as number[][])
      geom = { type: 'LineString', coordinates: coords }
    }

    return {
      id: `bts-yard/${props.OBJECTID}`,
      type: 'rail_yard' as const,
      geometry: geom,
      operator: String(props.RROWNER1_NAME ?? props.RROWNER1 ?? ''),
      lengthKm: 0,
    }
  })
}
