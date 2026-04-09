import type * as GeoJSON from 'geojson'
import { haversine } from '@/utils/geo.ts'
import { queryOverpass } from './overpassClient.ts'

// ---------------------------------------------------------------------------
// Types
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
  totalChunks: number
  failedChunks: number
  roadSegments: RoadSegment[]
  railSegments: RailSegment[]
}

/** Export chunkBbox for testing/visibility */
export { chunkBbox }

/**
 * Estimate total loading time for OSM + Infrastructure based on territory bbox.
 * Returns { chunks, queries, estimatedSeconds, estimatedLabel }.
 * Bbox is GeoJSON order: [west, south, east, north].
 */
export function estimateLoadingTime(bbox: [number, number, number, number]): {
  chunks: number
  queries: number
  estimatedSeconds: number
  estimatedLabel: string
} {
  const [west, south, east, north] = bbox
  const overpassBbox: OverpassBbox = [south, west, north, east]
  const chunks = chunkBbox(overpassBbox).length
  // Per chunk: 2 Overpass queries (roads + rail), ~15s each avg including cooldown
  // Plus 1 infrastructure query at end (~30s avg)
  const osmQueries = chunks * 2
  const infraQueries = 1
  const queries = osmQueries + infraQueries
  const estimatedSeconds = osmQueries * 15 + infraQueries * 30

  let estimatedLabel: string
  if (estimatedSeconds <= 60) {
    estimatedLabel = `~${estimatedSeconds}s`
  } else {
    const mins = Math.ceil(estimatedSeconds / 60)
    estimatedLabel = `~${mins} min`
  }

  return { chunks, queries, estimatedSeconds, estimatedLabel }
}

/** Bbox in [south, west, north, east] order for Overpass QL. */
type OverpassBbox = [number, number, number, number]

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max bbox area (in degrees^2) before we chunk into sub-bboxes. */
const MAX_BBOX_AREA = 10

/**
 * Split a large bbox into sub-bboxes that each fit within MAX_BBOX_AREA.
 * Input/output bbox format: [south, west, north, east].
 */
function chunkBbox(bbox: OverpassBbox): OverpassBbox[] {
  const [south, west, north, east] = bbox
  const width = east - west
  const height = north - south
  const area = width * height

  if (area <= MAX_BBOX_AREA) {
    return [bbox]
  }

  const cols = Math.ceil(Math.sqrt(area / MAX_BBOX_AREA))
  const rows = cols
  const stepW = width / cols
  const stepH = height / rows

  const chunks: OverpassBbox[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      chunks.push([
        south + r * stepH,
        west + c * stepW,
        south + (r + 1) * stepH,
        west + (c + 1) * stepW,
      ])
    }
  }
  return chunks
}

// ---------------------------------------------------------------------------
// Geometry conversion
// ---------------------------------------------------------------------------

/**
 * Convert Overpass way geometry `[{lat, lon}, ...]` to GeoJSON coordinates `[[lng, lat], ...]`.
 * Returns null if geometry is missing or has fewer than 2 points.
 */
function wayToLineString(
  geom: Array<{ lat: number; lon: number }> | undefined
): GeoJSON.LineString | null {
  if (!geom || geom.length < 2) return null
  // Filter out null/undefined points — Overpass can return these for
  // ways that partially intersect a bbox boundary
  const validPoints = geom.filter(
    (p) => p != null && typeof p.lon === 'number' && typeof p.lat === 'number'
  )
  if (validPoints.length < 2) return null
  return {
    type: 'LineString',
    coordinates: validPoints.map((p) => [p.lon, p.lat]),
  }
}

/**
 * Compute the total length (km) of a GeoJSON LineString using haversine.
 */
function lineStringLengthKm(line: GeoJSON.LineString): number {
  let total = 0
  const coords = line.coordinates as [number, number][]
  for (let i = 1; i < coords.length; i++) {
    total += haversine(coords[i - 1], coords[i])
  }
  return total
}

// ---------------------------------------------------------------------------
// Road classification
// ---------------------------------------------------------------------------

function classifyRoad(
  tags: Record<string, string>
): 'interstate' | 'highway' | 'trunk' {
  const hw = tags.highway
  const ref = tags.ref ?? ''

  if (hw === 'motorway' || ref.startsWith('I ') || ref.startsWith('I-')) {
    return 'interstate'
  }
  if (hw === 'trunk') {
    return 'trunk'
  }
  return 'highway'
}

// ---------------------------------------------------------------------------
// Public async generators
// ---------------------------------------------------------------------------

/**
 * Fetch road segments from Overpass for a bbox `[south, west, north, east]`.
 */
export async function* fetchRoads(
  bbox: OverpassBbox
): AsyncGenerator<RoadSegment> {
  const chunks = chunkBbox(bbox)

  for (const chunk of chunks) {
    const bboxStr = chunk.join(',')
    const query = `[out:json][timeout:180];
(
  way["highway"="motorway"](${bboxStr});
  way["highway"="trunk"](${bboxStr});
);
out body geom;`

    const result = await queryOverpass(query)

    for (const el of result.elements) {
      if (el.type !== 'way') continue
      const line = wayToLineString(el.geometry)
      if (!line) continue

      const tags = el.tags ?? {}
      const roadType = classifyRoad(tags)

      yield {
        id: `way/${el.id}`,
        type: roadType,
        geometry: line,
        ref: tags.ref ?? '',
        lengthKm: lineStringLengthKm(line),
      }
    }
  }
}

/**
 * Fetch rail segments from Overpass for a bbox `[south, west, north, east]`.
 */
export async function* fetchRail(
  bbox: OverpassBbox
): AsyncGenerator<RailSegment> {
  const chunks = chunkBbox(bbox)

  for (const chunk of chunks) {
    const bboxStr = chunk.join(',')
    const query = `[out:json][timeout:180];
(
  way["railway"="rail"](${bboxStr});
  node["railway"="yard"](${bboxStr});
);
out body geom;`

    const result = await queryOverpass(query)

    for (const el of result.elements) {
      const tags = el.tags ?? {}

      if (el.type === 'way') {
        const line = wayToLineString(el.geometry)
        if (!line) continue

        yield {
          id: `way/${el.id}`,
          type: 'railroad',
          geometry: line,
          operator: tags.operator ?? '',
          lengthKm: lineStringLengthKm(line),
        }
      } else if (el.type === 'node' && el.lat != null && el.lon != null) {
        yield {
          id: `node/${el.id}`,
          type: 'rail_yard',
          geometry: { type: 'Point', coordinates: [el.lon, el.lat] },
          operator: tags.operator ?? '',
          lengthKm: 0,
        }
      }
    }
  }
}

/**
 * Fetch administrative boundaries as GeoJSON for a bbox.
 */
export async function fetchBoundaries(
  bbox: OverpassBbox
): Promise<GeoJSON.FeatureCollection> {
  const bboxStr = bbox.join(',')
  const query = `[out:json][timeout:60];
(
  relation["boundary"="administrative"]["admin_level"~"^(4|6)$"](${bboxStr});
);
out body geom;`

  const result = await queryOverpass(query)

  const features: GeoJSON.Feature[] = result.elements
    .filter((el) => el.type === 'relation')
    .map((el) => ({
      type: 'Feature' as const,
      properties: { ...el.tags },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [],
      },
    }))

  return { type: 'FeatureCollection', features }
}

// ---------------------------------------------------------------------------
// Backward-compatible entry point used by usePipeline
// ---------------------------------------------------------------------------

/**
 * Load OSM road and rail data for a territory bbox.
 *
 * @param bbox Territory bbox in `[west, south, east, north]` (GeoJSON order).
 *             Converted internally to Overpass `[south, west, north, east]`.
 * @param onRoadProgress Callback with 0-100 progress for road loading.
 * @param onRailProgress Callback with 0-100 progress for rail loading.
 * @param onChunkInfo Callback with total chunk count and current chunk index.
 */
export async function loadOSMData(
  bbox: [number, number, number, number],
  onRoadProgress: (progress: number) => void,
  onRailProgress: (progress: number) => void,
  onChunkInfo?: (totalChunks: number, currentChunk: number) => void
): Promise<OSMLoadResult> {
  // Convert from GeoJSON bbox [west, south, east, north] to Overpass [south, west, north, east]
  const [west, south, east, north] = bbox
  const overpassBbox: OverpassBbox = [south, west, north, east]

  // Report chunk info for large territories
  const chunks = chunkBbox(overpassBbox)
  onChunkInfo?.(chunks.length, 0)

  let interstateCount = 0
  let highwayCount = 0
  let railroadCount = 0
  let yardCount = 0
  let totalRoadKm = 0
  let totalRailKm = 0
  let skippedCount = 0
  const roadSegments: RoadSegment[] = []
  const railSegments: RailSegment[] = []

  let failedChunks = 0

  // --- Interleaved: road + rail per chunk ---
  // Both progress bars advance together so the UI never looks stuck.
  let chunkIndex = 0
  for (const chunk of chunks) {
    chunkIndex++
    onChunkInfo?.(chunks.length, chunkIndex)
    const bboxStr = chunk.join(',')

    // Road query for this chunk
    try {
      const roadQuery = `[out:json][timeout:180];\n(\n  way["highway"="motorway"](${bboxStr});\n  way["highway"="trunk"](${bboxStr});\n);\nout body geom;`
      const result = await queryOverpass(roadQuery)

      for (const el of result.elements) {
        if (el.type !== 'way') continue
        const line = wayToLineString(el.geometry)
        if (!line) continue
        const tags = el.tags ?? {}
        const roadType = classifyRoad(tags)
        const km = lineStringLengthKm(line)
        totalRoadKm += km
        roadSegments.push({ id: `way/${el.id}`, type: roadType, geometry: line, ref: tags.ref ?? '', lengthKm: km })
        if (roadType === 'interstate') interstateCount++
        else highwayCount++
      }
    } catch (err) {
      failedChunks++
      skippedCount++
      console.warn(`Road chunk ${chunkIndex}/${chunks.length} failed, skipping: ${err instanceof Error ? err.message : String(err)}`)
    }
    // Linear progress per chunk — predictable
    onRoadProgress(Math.round((chunkIndex / chunks.length) * 100))

    // Rail query for this chunk
    try {
      const railQuery = `[out:json][timeout:180];\n(\n  way["railway"="rail"](${bboxStr});\n  node["railway"="yard"](${bboxStr});\n);\nout body geom;`
      const result = await queryOverpass(railQuery)

      for (const el of result.elements) {
        const tags = el.tags ?? {}
        if (el.type === 'way') {
          const line = wayToLineString(el.geometry)
          if (!line) continue
          const km = lineStringLengthKm(line)
          railSegments.push({ id: `way/${el.id}`, type: 'railroad', geometry: line, operator: tags.operator ?? '', lengthKm: km })
          railroadCount++
          totalRailKm += km
        } else if (el.type === 'node' && el.lat != null && el.lon != null) {
          railSegments.push({ id: `node/${el.id}`, type: 'rail_yard', geometry: { type: 'Point', coordinates: [el.lon, el.lat] }, operator: tags.operator ?? '', lengthKm: 0 })
          yardCount++
        }
      }
    } catch (err) {
      failedChunks++
      skippedCount++
      console.warn(`Rail chunk ${chunkIndex}/${chunks.length} failed, skipping: ${err instanceof Error ? err.message : String(err)}`)
    }
    onRailProgress(Math.round((chunkIndex / chunks.length) * 100))
  }

  return {
    interstateCount,
    highwayCount,
    railroadCount,
    yardCount,
    totalRoadKm: Math.round(totalRoadKm),
    totalRailKm: Math.round(totalRailKm),
    skippedCount,
    totalChunks: chunks.length,
    failedChunks,
    roadSegments,
    railSegments,
  }
}

// queryOverpass and delay now provided by overpassClient.ts
