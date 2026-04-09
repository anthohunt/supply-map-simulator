import type { Hub, HubTier, Edge, EdgeTier, CandidateSite, Region, Area, FreightFlow, FAFRecord } from '@/types/index.ts'
import { haversine } from '@/utils/geo.ts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVERAGE_TRUCK_SPEED_KPH = 80
const MAX_REGIONAL_TRAVEL_HOURS = 5.5
const MAX_REGIONAL_DISTANCE_KM = MAX_REGIONAL_TRAVEL_HOURS * AVERAGE_TRUCK_SPEED_KPH // ~440km

const TIER_COLORS: Record<EdgeTier, string> = {
  'global-regional': '#F5A623',
  'regional': '#EF5350',
  'gateway-local': '#1FBAD6',
  'access': '#66BB6A',
}

// ---------------------------------------------------------------------------
// Hub ID generation
// ---------------------------------------------------------------------------

let hubIdCounter = 0
function nextHubId(tier: HubTier): string {
  return `${tier}-${++hubIdCounter}`
}

function resetIdCounter(): void {
  hubIdCounter = 0
}

// ---------------------------------------------------------------------------
// Place Global Hubs (ports, airports — fixed locations)
// ---------------------------------------------------------------------------

export function placeGlobalHubs(sites: CandidateSite[]): Hub[] {
  const globalTypes = new Set(['port', 'airport'])
  const globalSites = sites.filter((s) => globalTypes.has(s.type))

  return globalSites.map((site) => ({
    id: nextHubId('global'),
    name: site.name,
    tier: 'global' as HubTier,
    position: site.position,
    regionId: '',
    areaId: '',
    throughputTons: 0,
    capacityTons: site.sqft * 2, // capacity proportional to facility size
    candidateSiteIds: [site.id],
    connectedHubIds: [],
    isFixed: true,
  }))
}

// ---------------------------------------------------------------------------
// Place Regional Hubs (one per region, from best candidate site)
// ---------------------------------------------------------------------------

export function placeRegionalHubs(
  regions: Region[],
  sites: CandidateSite[],
  _maxTravelHours: number = MAX_REGIONAL_TRAVEL_HOURS
): Hub[] {
  const hubs: Hub[] = []

  for (const region of regions) {
    // Find best candidate site near region centroid
    let bestSite: CandidateSite | null = null
    let bestDist = Infinity

    for (const site of sites) {
      const dist = haversine(site.position, region.centroid)
      if (dist < bestDist) {
        bestDist = dist
        bestSite = site
      }
    }

    if (bestSite) {
      hubs.push({
        id: nextHubId('regional'),
        name: `Regional Hub — ${region.id}`,
        tier: 'regional',
        position: bestSite.position,
        regionId: region.id,
        areaId: '',
        throughputTons: region.totalDemand,
        capacityTons: region.totalDemand * 1.2,
        candidateSiteIds: [bestSite.id],
        connectedHubIds: [],
        isFixed: false,
      })
    } else {
      // No candidate site — place at region centroid
      hubs.push({
        id: nextHubId('regional'),
        name: `Regional Hub — ${region.id}`,
        tier: 'regional',
        position: region.centroid,
        regionId: region.id,
        areaId: '',
        throughputTons: region.totalDemand,
        capacityTons: region.totalDemand * 1.2,
        candidateSiteIds: [],
        connectedHubIds: [],
        isFixed: false,
      })
    }
  }

  return hubs
}

// ---------------------------------------------------------------------------
// Place Gateway Hubs (one per area, from candidate sites near highways/rail)
// ---------------------------------------------------------------------------

export function placeGatewayHubs(
  areas: Area[],
  sites: CandidateSite[]
): Hub[] {
  const hubs: Hub[] = []

  for (const area of areas) {
    // Find best candidate site near area centroid
    let bestSite: CandidateSite | null = null
    let bestDist = Infinity

    for (const site of sites) {
      // Prefer sites close to highways/rail (lower nearestHighwayKm is better)
      const geoDist = haversine(site.position, area.centroid)
      const infraBonus = Math.max(0, 50 - site.nearestHighwayKm) * 0.5
      const score = geoDist - infraBonus
      if (score < bestDist) {
        bestDist = score
        bestSite = site
      }
    }

    if (bestSite) {
      hubs.push({
        id: nextHubId('gateway'),
        name: `Gateway Hub — ${area.id}`,
        tier: 'gateway',
        position: bestSite.position,
        regionId: area.regionId,
        areaId: area.id,
        throughputTons: area.totalDemand,
        capacityTons: area.totalDemand * 1.5,
        candidateSiteIds: [bestSite.id],
        connectedHubIds: [],
        isFixed: false,
      })
    } else {
      hubs.push({
        id: nextHubId('gateway'),
        name: `Gateway Hub — ${area.id}`,
        tier: 'gateway',
        position: area.centroid,
        regionId: area.regionId,
        areaId: area.id,
        throughputTons: area.totalDemand,
        capacityTons: area.totalDemand * 1.5,
        candidateSiteIds: [],
        connectedHubIds: [],
        isFixed: false,
      })
    }
  }

  return hubs
}

// ---------------------------------------------------------------------------
// Generate Edges
// ---------------------------------------------------------------------------

function edgeTierFor(source: Hub, target: Hub): EdgeTier {
  if (source.tier === 'global' || target.tier === 'global') return 'global-regional'
  if (source.tier === 'regional' && target.tier === 'regional') return 'regional'
  if (source.tier === 'gateway' || target.tier === 'gateway') return 'gateway-local'
  return 'access'
}

let edgeIdCounter = 0
function nextEdgeId(): string {
  return `edge-${++edgeIdCounter}`
}

export function generateEdges(hubs: Hub[]): Edge[] {
  edgeIdCounter = 0
  const edges: Edge[] = []

  const globalHubs = hubs.filter((h) => h.tier === 'global')
  const regionalHubs = hubs.filter((h) => h.tier === 'regional')
  const gatewayHubs = hubs.filter((h) => h.tier === 'gateway')

  // Connect each global hub to nearest regional hub
  for (const gh of globalHubs) {
    let nearest: Hub | null = null
    let nearestDist = Infinity
    for (const rh of regionalHubs) {
      const dist = haversine(gh.position, rh.position)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = rh
      }
    }
    if (nearest) {
      const tier = edgeTierFor(gh, nearest)
      edges.push({
        id: nextEdgeId(),
        sourceHubId: gh.id,
        targetHubId: nearest.id,
        tier,
        distanceKm: nearestDist,
        travelTimeHours: nearestDist / AVERAGE_TRUCK_SPEED_KPH,
        capacityTons: Math.min(gh.capacityTons, nearest.capacityTons),
        color: TIER_COLORS[tier],
      })
      gh.connectedHubIds.push(nearest.id)
      nearest.connectedHubIds.push(gh.id)
    }
  }

  // Connect regional hubs that are within max travel distance
  for (let i = 0; i < regionalHubs.length; i++) {
    for (let j = i + 1; j < regionalHubs.length; j++) {
      const dist = haversine(regionalHubs[i].position, regionalHubs[j].position)
      if (dist <= MAX_REGIONAL_DISTANCE_KM) {
        const tier: EdgeTier = 'regional'
        edges.push({
          id: nextEdgeId(),
          sourceHubId: regionalHubs[i].id,
          targetHubId: regionalHubs[j].id,
          tier,
          distanceKm: dist,
          travelTimeHours: dist / AVERAGE_TRUCK_SPEED_KPH,
          capacityTons: Math.min(regionalHubs[i].capacityTons, regionalHubs[j].capacityTons),
          color: TIER_COLORS[tier],
        })
        regionalHubs[i].connectedHubIds.push(regionalHubs[j].id)
        regionalHubs[j].connectedHubIds.push(regionalHubs[i].id)
      }
    }
  }

  // Connect each gateway hub to the regional hub in its region
  for (const gw of gatewayHubs) {
    const regionHub = regionalHubs.find((rh) => rh.regionId === gw.regionId)
    if (regionHub) {
      const dist = haversine(gw.position, regionHub.position)
      const tier: EdgeTier = 'gateway-local'
      edges.push({
        id: nextEdgeId(),
        sourceHubId: gw.id,
        targetHubId: regionHub.id,
        tier,
        distanceKm: dist,
        travelTimeHours: dist / AVERAGE_TRUCK_SPEED_KPH,
        capacityTons: Math.min(gw.capacityTons, regionHub.capacityTons),
        color: TIER_COLORS[tier],
      })
      gw.connectedHubIds.push(regionHub.id)
      regionHub.connectedHubIds.push(gw.id)
    } else {
      // No regional hub in this region — connect to nearest regional hub
      let nearest: Hub | null = null
      let nearestDist = Infinity
      for (const rh of regionalHubs) {
        const dist = haversine(gw.position, rh.position)
        if (dist < nearestDist) {
          nearestDist = dist
          nearest = rh
        }
      }
      if (nearest) {
        const tier: EdgeTier = 'gateway-local'
        edges.push({
          id: nextEdgeId(),
          sourceHubId: gw.id,
          targetHubId: nearest.id,
          tier,
          distanceKm: nearestDist,
          travelTimeHours: nearestDist / AVERAGE_TRUCK_SPEED_KPH,
          capacityTons: Math.min(gw.capacityTons, nearest.capacityTons),
          color: TIER_COLORS[tier],
        })
        gw.connectedHubIds.push(nearest.id)
        nearest.connectedHubIds.push(gw.id)
      }
    }
  }

  return edges
}

// ---------------------------------------------------------------------------
// Full network generation pipeline
// ---------------------------------------------------------------------------

export interface GenerateNetworkResult {
  hubs: Hub[]
  edges: Edge[]
}

export function generateNetwork(
  regions: Region[],
  areas: Area[],
  sites: CandidateSite[],
  onProgress?: (progress: number) => void,
): GenerateNetworkResult {
  resetIdCounter()
  onProgress?.(10)

  // Step 1: Place global hubs (ports, airports)
  const globalHubs = placeGlobalHubs(sites)
  onProgress?.(25)

  // Step 2: Place regional hubs
  const regionalHubs = placeRegionalHubs(regions, sites)
  onProgress?.(50)

  // Step 3: Place gateway hubs
  const gatewayHubs = placeGatewayHubs(areas, sites)
  onProgress?.(70)

  const allHubs = [...globalHubs, ...regionalHubs, ...gatewayHubs]

  // Step 4: Generate edges
  const edges = generateEdges(allHubs)
  onProgress?.(100)

  return { hubs: allHubs, edges }
}

// ---------------------------------------------------------------------------
// Route Flows — shortest-path through the hub network (BFS)
// ---------------------------------------------------------------------------

let flowIdCounter = 0

function buildAdjacency(hubs: Hub[], edges: Edge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>()
  for (const hub of hubs) {
    adj.set(hub.id, [])
  }
  for (const edge of edges) {
    adj.get(edge.sourceHubId)?.push(edge.targetHubId)
    adj.get(edge.targetHubId)?.push(edge.sourceHubId)
  }
  return adj
}

function bfsPath(adj: Map<string, string[]>, start: string, end: string): string[] | null {
  if (start === end) return [start]
  const visited = new Set<string>([start])
  const queue: Array<{ node: string; path: string[] }> = [{ node: start, path: [start] }]

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = adj.get(current.node) ?? []
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue
      const newPath = [...current.path, neighbor]
      if (neighbor === end) return newPath
      visited.add(neighbor)
      queue.push({ node: neighbor, path: newPath })
    }
  }
  return null
}

function findNearestHub(hubs: Hub[], position: [number, number]): Hub | null {
  let best: Hub | null = null
  let bestDist = Infinity
  for (const hub of hubs) {
    const dist = haversine(hub.position, position)
    if (dist < bestDist) {
      bestDist = dist
      best = hub
    }
  }
  return best
}

export function routeFlows(
  fafRecords: FAFRecord[],
  hubs: Hub[],
  edges: Edge[],
  countyPositions?: Map<string, [number, number]>
): FreightFlow[] {
  flowIdCounter = 0
  if (hubs.length === 0 || edges.length === 0) return []

  const adj = buildAdjacency(hubs, edges)

  // Build county-to-hub mapping: for each FAF origin/dest FIPS,
  // find the nearest gateway (preferred) or any hub
  const gatewayHubs = hubs.filter((h) => h.tier === 'gateway')
  const lookupHubs = gatewayHubs.length > 0 ? gatewayHubs : hubs

  const fipsToHub = new Map<string, string>()

  function resolveHub(fips: string): string | null {
    if (fipsToHub.has(fips)) return fipsToHub.get(fips)!
    const pos = countyPositions?.get(fips)
    if (!pos) {
      // Fallback: assign to a random gateway hub for demonstration
      const fallback = lookupHubs[Math.abs(hashCode(fips)) % lookupHubs.length]
      if (fallback) {
        fipsToHub.set(fips, fallback.id)
        return fallback.id
      }
      return null
    }
    const nearest = findNearestHub(lookupHubs, pos)
    if (nearest) {
      fipsToHub.set(fips, nearest.id)
      return nearest.id
    }
    return null
  }

  const flows: FreightFlow[] = []

  for (const record of fafRecords) {
    if (record.annualTons <= 0) continue

    const originHubId = resolveHub(record.originFips)
    const destHubId = resolveHub(record.destFips)
    if (!originHubId || !destHubId) continue
    if (originHubId === destHubId) continue

    const route = bfsPath(adj, originHubId, destHubId)
    if (!route) continue

    flows.push({
      id: `flow-${++flowIdCounter}`,
      originHubId,
      destinationHubId: destHubId,
      commodity: record.commodity,
      volumeTons: record.annualTons,
      routeHubIds: route,
    })
  }

  return flows
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash
}
