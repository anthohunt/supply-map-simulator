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
 * Build a GeoJSON FeatureCollection from hubs, edges, and regions.
 */
export function buildGeoJSON(
  hubs: Hub[],
  edges: Edge[],
  regions: Region[],
): GeoJSONExportResult {
  const warnings: string[] = []
  const features: GeoJSON.Feature[] = []

  // Hubs as Points
  for (const hub of hubs) {
    if (!hub.position || hub.position.length < 2) {
      warnings.push(`Hub "${hub.name}" (${hub.id}) skipped — missing geometry`)
      continue
    }
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [hub.position[0], hub.position[1]],
      },
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
      geometry: {
        type: 'LineString',
        coordinates: [
          [source.position[0], source.position[1]],
          [target.position[0], target.position[1]],
        ],
      },
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
      geometry: region.boundary,
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
 * Capture the map container as a PNG blob using html2canvas-style approach.
 * Uses the leaflet map's built-in canvas rendering.
 */
export async function captureMapAsPNG(
  mapContainer: HTMLElement,
): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(mapContainer, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#242730',
    logging: false,
  })
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to create PNG blob'))
    }, 'image/png')
  })
}
