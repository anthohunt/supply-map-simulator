import type { Hub, Edge, FreightFlow } from '@/types/index.ts'
import type { Region } from '@/types/region.ts'

export interface GeoJSONExportResult {
  geojson: GeoJSON.FeatureCollection
  warnings: string[]
  sizeBytes: number
}

export interface JSONExportResult {
  data: ExportedHub[]
  warnings: string[]
}

export interface CSVExportResult {
  csv: string
  rowCount: number
  warnings: string[]
}

export interface ExportedHub {
  id: string
  name: string
  tier: string
  lat: number
  lng: number
  throughput: number
  capacity: number
  connectedHubIds: string[]
  estimated: boolean
}

/**
 * Round a coordinate value to the given number of decimal places.
 * Used for coordinate simplification in GeoJSON export.
 */
function roundCoord(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(val * factor) / factor
}

function simplifyGeometry(geometry: GeoJSON.Geometry, decimals: number): GeoJSON.Geometry {
  if (decimals === null || decimals === undefined) return geometry

  function roundPos(pos: GeoJSON.Position): GeoJSON.Position {
    return pos.map((v) => roundCoord(v, decimals)) as GeoJSON.Position
  }

  switch (geometry.type) {
    case 'Point':
      return { ...geometry, coordinates: roundPos(geometry.coordinates) }
    case 'LineString':
      return { ...geometry, coordinates: geometry.coordinates.map(roundPos) }
    case 'Polygon':
      return { ...geometry, coordinates: geometry.coordinates.map((ring) => ring.map(roundPos)) }
    case 'MultiPolygon':
      return { ...geometry, coordinates: geometry.coordinates.map((poly) => poly.map((ring) => ring.map(roundPos))) }
    default:
      return geometry
  }
}

/**
 * Build a GeoJSON FeatureCollection from hubs, edges, and regions.
 * Pass `coordinateDecimals` to round coordinates (e.g. 2 for simplified export).
 */
export function buildGeoJSON(
  hubs: Hub[],
  edges: Edge[],
  regions: Region[],
  coordinateDecimals?: number,
): GeoJSONExportResult {
  const warnings: string[] = []
  const features: GeoJSON.Feature[] = []

  const applyPrecision = coordinateDecimals !== undefined
    ? (geom: GeoJSON.Geometry) => simplifyGeometry(geom, coordinateDecimals)
    : (geom: GeoJSON.Geometry) => geom

  // Hubs as Points
  for (const hub of hubs) {
    if (!hub.position || hub.position.length < 2) {
      warnings.push(`Hub "${hub.name}" (${hub.id}) skipped — missing geometry`)
      continue
    }
    features.push({
      type: 'Feature',
      geometry: applyPrecision({
        type: 'Point',
        coordinates: [hub.position[0], hub.position[1]],
      }),
      properties: {
        featureType: 'hub',
        id: hub.id,
        name: hub.name,
        tier: hub.tier,
        throughputTons: hub.throughputTons,
        capacityTons: hub.capacityTons,
        isFixed: hub.isFixed,
        regionId: hub.regionId,
        areaId: hub.areaId,
        connectedHubIds: hub.connectedHubIds,
      },
    })
  }

  // Edges as LineStrings
  const hubMap = new Map(hubs.map((h) => [h.id, h]))
  for (const edge of edges) {
    const source = hubMap.get(edge.sourceHubId)
    const target = hubMap.get(edge.targetHubId)
    if (!source?.position || !target?.position) {
      warnings.push(`Edge ${edge.id} skipped — missing hub geometry`)
      continue
    }
    features.push({
      type: 'Feature',
      geometry: applyPrecision({
        type: 'LineString',
        coordinates: [
          [source.position[0], source.position[1]],
          [target.position[0], target.position[1]],
        ],
      }),
      properties: {
        featureType: 'edge',
        id: edge.id,
        sourceHubId: edge.sourceHubId,
        targetHubId: edge.targetHubId,
        tier: edge.tier,
        distanceKm: edge.distanceKm,
        travelTimeHours: edge.travelTimeHours,
        capacityTons: edge.capacityTons,
      },
    })
  }

  // Regions as Polygons
  for (const region of regions) {
    if (!region.boundary) {
      warnings.push(`Region ${region.id} skipped — missing boundary`)
      continue
    }
    features.push({
      type: 'Feature',
      geometry: applyPrecision(region.boundary),
      properties: {
        featureType: 'region',
        id: region.id,
        areaIds: region.areaIds,
        totalDemand: region.totalDemand,
        color: region.color,
      },
    })
  }

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features,
  }

  const jsonStr = JSON.stringify(geojson)
  const sizeBytes = new Blob([jsonStr]).size

  return { geojson, warnings, sizeBytes }
}

/**
 * Build a JSON array of hub objects for export.
 * Respects optional tier filter.
 */
export function buildHubJSON(
  hubs: Hub[],
  tierFilter?: Set<string>,
): JSONExportResult {
  const warnings: string[] = []
  const filtered = tierFilter ? hubs.filter((h) => tierFilter.has(h.tier)) : hubs

  const data: ExportedHub[] = filtered.map((hub) => ({
    id: hub.id,
    name: hub.name,
    tier: hub.tier,
    lat: hub.position[1],
    lng: hub.position[0],
    throughput: hub.throughputTons ?? 0,
    capacity: hub.capacityTons ?? 0,
    connectedHubIds: hub.connectedHubIds,
    estimated: hub.throughputTons != null && hub.throughputTons > 0,
  }))

  return { data, warnings }
}

/**
 * Build CSV string from freight flows.
 * Properly quotes fields containing commas, quotes, or newlines.
 */
export function buildFlowCSV(
  flows: FreightFlow[],
  _hubs?: Hub[],
): CSVExportResult {
  const warnings: string[] = []
  const headers = ['originHubId', 'destinationHubId', 'commodity', 'volumeTons', 'routeHops']

  if (flows.length === 0) {
    return { csv: '', rowCount: 0, warnings: ['No flow data to export'] }
  }

  const rows = [headers.join(',')]

  for (const flow of flows) {
    const routeHops = flow.routeHubIds.length > 0 ? flow.routeHubIds.length - 1 : 0
    rows.push([
      csvQuote(flow.originHubId),
      csvQuote(flow.destinationHubId),
      csvQuote(flow.commodity),
      String(flow.volumeTons),
      String(routeHops),
    ].join(','))
  }

  return { csv: rows.join('\n'), rowCount: flows.length, warnings }
}

function csvQuote(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Capture the map container as a PNG blob.
 * Composites all Leaflet panes: tile <img> elements, existing <canvas>, and SVG overlays.
 */
export async function captureMapAsPNG(
  mapContainer: HTMLElement,
): Promise<Blob> {
  const rect = mapContainer.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)

  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const ctx = output.getContext('2d')!
  ctx.fillStyle = '#242730'
  ctx.fillRect(0, 0, width, height)

  // Helper: load an image URL onto canvas at given offset
  const drawImageFromURL = (url: string, x: number, y: number, w: number, h: number): Promise<void> => {
    return new Promise<void>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { ctx.drawImage(img, x, y, w, h); resolve() }
      img.onerror = () => resolve() // skip failed tiles silently
      img.src = url
    })
  }

  // 1. Draw tile <img> elements from the tile pane (Leaflet renders raster tiles as <img>)
  const tileImgs = mapContainer.querySelectorAll<HTMLImageElement>('.leaflet-tile-pane img.leaflet-tile')
  await Promise.all(Array.from(tileImgs).map(async (img) => {
    if (!img.complete || !img.src) return
    const cr = img.getBoundingClientRect()
    if (cr.width === 0 || cr.height === 0) return
    await drawImageFromURL(img.src, cr.left - rect.left, cr.top - rect.top, cr.width, cr.height)
  }))

  // 2. Draw any existing <canvas> elements (canvas tile renderers, WebGL layers)
  const canvases = mapContainer.querySelectorAll<HTMLCanvasElement>('canvas')
  for (const c of canvases) {
    if (c.width === 0 || c.height === 0) continue
    const cr = c.getBoundingClientRect()
    ctx.drawImage(c, cr.left - rect.left, cr.top - rect.top, cr.width, cr.height)
  }

  // 3. Serialize and draw SVG overlay panes (hubs, edges, boundaries, flow lines)
  const svgs = mapContainer.querySelectorAll<SVGSVGElement>('svg')
  await Promise.all(Array.from(svgs).map(async (svg) => {
    const cr = svg.getBoundingClientRect()
    if (cr.width === 0 || cr.height === 0) return
    // Skip the attribution flag icon (tiny decorative SVG)
    if (svg.classList.contains('leaflet-attribution-flag')) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    await new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, cr.left - rect.left, cr.top - rect.top, cr.width, cr.height)
        URL.revokeObjectURL(url)
        resolve()
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve() }
      img.src = url
    })
  }))

  return new Promise((resolve, reject) => {
    output.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to create PNG blob'))
    }, 'image/png')
  })
}
