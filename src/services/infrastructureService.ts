import type { CandidateSite, SiteType } from '@/types/index.ts'
import { haversine } from '@/utils/geo.ts'
import { queryOverpass } from './overpassClient.ts'
import type { OverpassElement } from './overpassClient.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InfraLoadResult {
  sites: CandidateSite[]
  warehouseCount: number
  terminalCount: number
  dcCount: number
  portCount: number
  airportCount: number
  railYardCount: number
  skippedCount: number
  duplicatesRemoved: number
  fewSitesWarning: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SQ_METERS_TO_SQ_FEET = 10.764
const DEFAULT_NODE_SQFT = 50_000
const FEW_SITES_THRESHOLD = 10
const DEDUP_RADIUS_KM = 0.5

/**
 * Build the Overpass QL query for logistics facilities within a bbox.
 * Bbox is in Overpass order: [south, west, north, east].
 */
function buildInfraQuery(bboxStr: string): string {
  return `[out:json][timeout:180];
(
  way["building"="warehouse"](${bboxStr});
  way["building"="industrial"](${bboxStr});
  way["landuse"="industrial"]["name"](${bboxStr});
  node["amenity"="fuel"]["hgv"="yes"](${bboxStr});
  way["aeroway"="aerodrome"](${bboxStr});
  node["aeroway"="aerodrome"](${bboxStr});
  way["harbour"="yes"](${bboxStr});
  node["harbour"="yes"](${bboxStr});
  way["man_made"="works"](${bboxStr});
  node["railway"="yard"](${bboxStr});
);
out center tags;`
}

// ---------------------------------------------------------------------------
// OSM tag → site type mapping
// ---------------------------------------------------------------------------

function classifySiteType(tags: Record<string, string>): SiteType | null {
  if (tags.building === 'warehouse') return 'warehouse'
  if (tags.building === 'industrial') return 'distribution_center'
  if (tags['man_made'] === 'works') return 'distribution_center'
  if (tags.amenity === 'fuel' && tags.hgv === 'yes') return 'terminal'
  if (tags.aeroway === 'aerodrome') return 'airport'
  if (tags.harbour === 'yes') return 'port'
  if (tags.railway === 'yard') return 'rail_yard'
  if (tags.landuse === 'industrial' && tags.name) return 'distribution_center'
  return null
}

// ---------------------------------------------------------------------------
// Area estimation
// ---------------------------------------------------------------------------

/**
 * Estimate area in sqft from way geometry nodes using the Shoelace formula.
 * Coordinates are in lat/lon — we approximate using meters at the centroid latitude.
 */
function estimateWayAreaSqft(
  geometry: Array<{ lat: number; lon: number }> | undefined
): number | null {
  if (!geometry || geometry.length < 3) return null

  // Compute centroid latitude for the meter-per-degree approximation
  const avgLat =
    geometry.reduce((sum, p) => sum + p.lat, 0) / geometry.length
  const latRad = (avgLat * Math.PI) / 180

  // Meters per degree at this latitude
  const mPerDegLat = 111_320
  const mPerDegLon = 111_320 * Math.cos(latRad)

  // Convert to meters relative to first point
  const pts = geometry.map((p) => ({
    x: (p.lon - geometry[0].lon) * mPerDegLon,
    y: (p.lat - geometry[0].lat) * mPerDegLat,
  }))

  // Shoelace formula for polygon area
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i].x * pts[j].y
    area -= pts[j].x * pts[i].y
  }
  area = Math.abs(area) / 2

  if (area <= 0) return null
  return Math.round(area * SQ_METERS_TO_SQ_FEET)
}

// ---------------------------------------------------------------------------
// Site name generation
// ---------------------------------------------------------------------------

function generateSiteName(
  tags: Record<string, string>,
  siteType: SiteType
): string {
  if (tags.name) return tags.name

  const typeLabels: Record<SiteType, string> = {
    warehouse: 'Warehouse',
    distribution_center: 'Distribution Center',
    terminal: 'Truck Terminal',
    airport: 'Airport',
    port: 'Port',
    rail_yard: 'Rail Yard',
  }

  const parts: string[] = []
  if (tags.operator) parts.push(tags.operator)
  parts.push(typeLabels[siteType])

  return parts.join(' ')
}

// ---------------------------------------------------------------------------
// Element → CandidateSite conversion
// ---------------------------------------------------------------------------

function elementToSite(
  el: OverpassElement,
  minSqft: number
): CandidateSite | null {
  const tags = el.tags ?? {}
  const siteType = classifySiteType(tags)
  if (!siteType) return null

  // Determine position
  let lng: number | undefined
  let lat: number | undefined

  if (el.type === 'node') {
    lng = el.lon
    lat = el.lat
  } else if (el.center) {
    lng = el.center.lon
    lat = el.center.lat
  }

  if (lng == null || lat == null) return null

  // Estimate area
  let sqft: number
  if (el.type === 'way' && el.geometry) {
    const estimated = estimateWayAreaSqft(el.geometry)
    if (estimated != null && estimated > 0) {
      sqft = estimated
    } else {
      sqft = DEFAULT_NODE_SQFT
    }
  } else {
    sqft = DEFAULT_NODE_SQFT
  }

  if (sqft < minSqft) return null

  return {
    id: `${el.type}/${el.id}`,
    name: generateSiteName(tags, siteType),
    type: siteType,
    position: [lng, lat],
    sqft,
    nearestHighwayKm: 0,
    nearestRailKm: 0,
    assignedHubId: null,
  }
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Remove duplicate sites: within `radiusKm` of each other and same type,
 * keep the larger one. Returns deduplicated array and count removed.
 */
export function deduplicateSites(
  sites: CandidateSite[],
  radiusKm: number
): { sites: CandidateSite[]; removedCount: number } {
  const removed = new Set<number>()

  for (let i = 0; i < sites.length; i++) {
    if (removed.has(i)) continue
    for (let j = i + 1; j < sites.length; j++) {
      if (removed.has(j)) continue
      if (sites[i].type !== sites[j].type) continue

      const dist = haversine(sites[i].position, sites[j].position)
      if (dist <= radiusKm) {
        // Keep the larger one
        if (sites[i].sqft >= sites[j].sqft) {
          removed.add(j)
        } else {
          removed.add(i)
          break // i is removed, stop comparing from it
        }
      }
    }
  }

  const deduplicated = sites.filter((_, idx) => !removed.has(idx))
  return { sites: deduplicated, removedCount: removed.size }
}

// ---------------------------------------------------------------------------
// Main service: findCandidateSites
// ---------------------------------------------------------------------------

/**
 * Query real logistics facilities from OpenStreetMap via Overpass API.
 *
 * @param bbox Territory bbox in GeoJSON order: `[west, south, east, north]`.
 * @param minSqft Minimum square footage to include a site.
 * @param onProgress Progress callback (0-100).
 */
export async function findCandidateSites(
  bbox: [number, number, number, number],
  minSqft: number,
  onProgress?: (progress: number) => void
): Promise<{
  sites: CandidateSite[]
  skippedCount: number
  fewSitesWarning: boolean
}> {
  onProgress?.(5)

  // Convert from GeoJSON [west, south, east, north] to Overpass [south, west, north, east]
  const [west, south, east, north] = bbox
  const bboxStr = `${south},${west},${north},${east}`

  onProgress?.(10)
  const query = buildInfraQuery(bboxStr)
  const result = await queryOverpass(query)
  onProgress?.(60)

  let skippedCount = 0
  const sites: CandidateSite[] = []

  for (const el of result.elements) {
    const site = elementToSite(el, minSqft)
    if (site) {
      sites.push(site)
    } else {
      skippedCount++
    }
  }

  onProgress?.(90)

  const fewSitesWarning = sites.length < FEW_SITES_THRESHOLD

  onProgress?.(100)

  return { sites, skippedCount, fewSitesWarning }
}

// ---------------------------------------------------------------------------
// Backward-compatible entry point used by usePipeline
// ---------------------------------------------------------------------------

/**
 * Load infrastructure data for a territory bbox.
 *
 * @param bbox Territory bbox in GeoJSON order: `[west, south, east, north]`.
 * @param onProgress Progress callback (0-100).
 * @param minSqft Minimum sqft threshold (default 10,000).
 */
export async function loadInfrastructureData(
  bbox: [number, number, number, number],
  onProgress: (progress: number) => void,
  minSqft: number = 10_000
): Promise<InfraLoadResult> {
  const { sites: rawSites, skippedCount, fewSitesWarning } =
    await findCandidateSites(bbox, minSqft, onProgress)

  // Deduplicate
  const { sites, removedCount } = deduplicateSites(rawSites, DEDUP_RADIUS_KM)

  const countByType = (type: SiteType): number =>
    sites.filter((s) => s.type === type).length

  return {
    sites,
    warehouseCount: countByType('warehouse'),
    terminalCount: countByType('terminal'),
    dcCount: countByType('distribution_center'),
    portCount: countByType('port'),
    airportCount: countByType('airport'),
    railYardCount: countByType('rail_yard'),
    skippedCount,
    duplicatesRemoved: removedCount,
    fewSitesWarning,
  }
}

// queryOverpass and delay now provided by overpassClient.ts
