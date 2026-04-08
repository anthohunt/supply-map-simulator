import skmeans from 'skmeans'
import type { County, Area, Region, ClusteringParams } from '@/types/index.ts'
import { centroid as computeCentroid } from '@/utils/geo'

const REGION_COLORS = [
  '#1FBAD6', '#F5A623', '#EF5350', '#AB47BC', '#66BB6A',
  '#FF7043', '#42A5F5', '#EC407A', '#26A69A', '#FFCA28',
  '#8D6E63', '#78909C', '#7E57C2', '#29B6F6', '#D4E157',
]

/**
 * Build a union polygon from county boundaries (simplified: convex hull of all coords).
 */
function mergedBoundary(
  counties: County[]
): GeoJSON.Polygon {
  const allCoords: [number, number][] = []
  for (const c of counties) {
    for (const ring of c.boundary.coordinates) {
      for (const coord of ring) {
        allCoords.push(coord as [number, number])
      }
    }
  }

  if (allCoords.length === 0) {
    return { type: 'Polygon', coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] }
  }

  // Convex hull using Graham scan
  const hull = convexHull(allCoords)
  return { type: 'Polygon', coordinates: [hull] }
}

function convexHull(points: [number, number][]): [number, number][] {
  if (points.length <= 3) {
    return [...points, points[0]]
  }

  // Sort by x, then by y
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])

  const cross = (
    o: [number, number],
    a: [number, number],
    b: [number, number]
  ) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

  // Lower hull
  const lower: [number, number][] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  // Upper hull
  const upper: [number, number][] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  // Remove last point of each half because it's repeated
  lower.pop()
  upper.pop()

  const hull = [...lower, ...upper]
  // Close the ring
  hull.push(hull[0])
  return hull
}

/**
 * Check if two counties are geographically adjacent (bboxes overlap or touch).
 */
function areAdjacent(a: County, b: County): boolean {
  const threshold = 0.25 // ~25km at mid-latitudes
  const dist = Math.sqrt(
    Math.pow(a.centroid[0] - b.centroid[0], 2) +
    Math.pow(a.centroid[1] - b.centroid[1], 2)
  )
  return dist < threshold
}

/**
 * Build adjacency graph for a set of counties.
 */
function buildAdjacencyMap(counties: County[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>()
  for (const c of counties) {
    adj.set(c.fips, new Set())
  }
  for (let i = 0; i < counties.length; i++) {
    for (let j = i + 1; j < counties.length; j++) {
      if (areAdjacent(counties[i], counties[j])) {
        adj.get(counties[i].fips)!.add(counties[j].fips)
        adj.get(counties[j].fips)!.add(counties[i].fips)
      }
    }
  }
  return adj
}

/**
 * Check if a set of counties forms a contiguous group using BFS.
 */
function isContiguous(fipsSet: Set<string>, adjacency: Map<string, Set<string>>): boolean {
  if (fipsSet.size <= 1) return true

  const start = fipsSet.values().next().value!
  const visited = new Set<string>([start])
  const queue = [start]

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = adjacency.get(current)
    if (!neighbors) continue

    for (const neighbor of neighbors) {
      if (fipsSet.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  return visited.size === fipsSet.size
}

/**
 * Cluster counties into areas using demand-weighted K-means.
 */
export function clusterCountiesToAreas(
  counties: County[],
  params: ClusteringParams
): Area[] {
  if (counties.length === 0) return []

  // Target area count: ~2-3x the target region count, capped by county count
  const targetAreas = Math.min(
    Math.max(params.targetRegions * 2, 3),
    counties.length
  )

  if (counties.length <= targetAreas) {
    // Each county becomes its own area
    return counties.map((c, i) => ({
      id: `area-${i}`,
      regionId: '',
      countyFips: [c.fips],
      centroid: c.centroid,
      boundary: c.boundary,
      totalDemand: c.demandTons,
      isContiguous: true,
    }))
  }

  // Build feature vectors: [lng, lat, normalizedDemand]
  const maxDemand = Math.max(...counties.map((c) => c.demandTons), 1)
  const demandWeight = params.demandBalanceWeight

  const features = counties.map((c) => [
    c.centroid[0],
    c.centroid[1],
    (c.demandTons / maxDemand) * demandWeight * 2, // scale demand influence
  ])

  const result = skmeans(features, targetAreas, 'kmpp', params.maxIterations)

  // Group counties by cluster assignment
  const clusters = new Map<number, County[]>()
  for (let i = 0; i < counties.length; i++) {
    const clusterId = result.idxs[i]
    if (!clusters.has(clusterId)) {
      clusters.set(clusterId, [])
    }
    clusters.get(clusterId)!.push(counties[i])
  }

  // Build areas from clusters
  const areas: Area[] = []
  let areaIndex = 0
  for (const [, clusterCounties] of clusters) {
    const fipsList = clusterCounties.map((c) => c.fips)
    const totalDemand = clusterCounties.reduce((s, c) => s + c.demandTons, 0)
    const cent = computeCentroid(clusterCounties.map((c) => c.centroid))

    areas.push({
      id: `area-${areaIndex}`,
      regionId: '',
      countyFips: fipsList,
      centroid: cent,
      boundary: mergedBoundary(clusterCounties),
      totalDemand,
      isContiguous: false, // will be set by postProcess
    })
    areaIndex++
  }

  return areas
}

/**
 * Group areas into regions using K-means on area centroids weighted by demand.
 */
export function clusterAreasToRegions(
  areas: Area[],
  params: ClusteringParams
): Region[] {
  if (areas.length === 0) return []

  const targetRegions = Math.min(params.targetRegions, areas.length)

  if (areas.length <= targetRegions) {
    return areas.map((a, i) => ({
      id: `region-${i}`,
      areaIds: [a.id],
      centroid: a.centroid,
      boundary: a.boundary,
      totalDemand: a.totalDemand,
      color: REGION_COLORS[i % REGION_COLORS.length],
    }))
  }

  const maxDemand = Math.max(...areas.map((a) => a.totalDemand), 1)
  const demandWeight = params.demandBalanceWeight

  const features = areas.map((a) => [
    a.centroid[0],
    a.centroid[1],
    (a.totalDemand / maxDemand) * demandWeight * 2,
  ])

  const result = skmeans(features, targetRegions, 'kmpp', params.maxIterations)

  const clusters = new Map<number, Area[]>()
  for (let i = 0; i < areas.length; i++) {
    const clusterId = result.idxs[i]
    if (!clusters.has(clusterId)) {
      clusters.set(clusterId, [])
    }
    clusters.get(clusterId)!.push(areas[i])
  }

  const regions: Region[] = []
  let regionIndex = 0
  for (const [, clusterAreas] of clusters) {
    const areaIds = clusterAreas.map((a) => a.id)
    const totalDemand = clusterAreas.reduce((s, a) => s + a.totalDemand, 0)
    const cent = computeCentroid(clusterAreas.map((a) => a.centroid))

    // Collect all county boundaries from all areas to build region boundary
    const allCountyCoords: [number, number][] = []
    for (const area of clusterAreas) {
      for (const ring of area.boundary.coordinates) {
        for (const coord of ring) {
          allCountyCoords.push(coord as [number, number])
        }
      }
    }

    const hull = convexHull(allCountyCoords)

    // Update area regionIds
    for (const area of clusterAreas) {
      area.regionId = `region-${regionIndex}`
    }

    regions.push({
      id: `region-${regionIndex}`,
      areaIds,
      centroid: cent,
      boundary: { type: 'Polygon', coordinates: [hull] },
      totalDemand,
      color: REGION_COLORS[regionIndex % REGION_COLORS.length],
    })
    regionIndex++
  }

  return regions
}

/**
 * Post-process areas for contiguity: check each area and reassign
 * disconnected fragments to neighboring areas.
 */
export function postProcess(
  areas: Area[],
  counties: County[]
): Area[] {
  const countyMap = new Map(counties.map((c) => [c.fips, c]))
  const adjacency = buildAdjacencyMap(counties)

  const processed = areas.map((area) => {
    const fipsSet = new Set(area.countyFips)
    const contiguous = isContiguous(fipsSet, adjacency)

    return {
      ...area,
      isContiguous: contiguous,
    }
  })

  // For non-contiguous areas, try to reassign disconnected fragments
  for (const area of processed) {
    if (area.isContiguous) continue

    const fipsSet = new Set(area.countyFips)
    if (fipsSet.size <= 1) {
      area.isContiguous = true
      continue
    }

    // Find connected components via BFS
    const visited = new Set<string>()
    const components: string[][] = []

    for (const fips of fipsSet) {
      if (visited.has(fips)) continue

      const component: string[] = []
      const queue = [fips]
      visited.add(fips)

      while (queue.length > 0) {
        const current = queue.shift()!
        component.push(current)

        const neighbors = adjacency.get(current)
        if (!neighbors) continue

        for (const neighbor of neighbors) {
          if (fipsSet.has(neighbor) && !visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        }
      }

      components.push(component)
    }

    if (components.length <= 1) {
      area.isContiguous = true
      continue
    }

    // Keep largest component, reassign others to nearest area
    components.sort((a, b) => b.length - a.length)
    // Keep largest component (index 0 after sort), reassign rest
    for (let i = 1; i < components.length; i++) {
      for (const fips of components[i]) {
        // Remove from current area
        area.countyFips = area.countyFips.filter((f) => f !== fips)

        // Find nearest other area by centroid distance
        const county = countyMap.get(fips)
        if (!county) continue

        let bestArea: typeof area | null = null
        let bestDist = Infinity

        for (const other of processed) {
          if (other.id === area.id) continue
          const dist = Math.sqrt(
            Math.pow(county.centroid[0] - other.centroid[0], 2) +
            Math.pow(county.centroid[1] - other.centroid[1], 2)
          )
          if (dist < bestDist) {
            bestDist = dist
            bestArea = other
          }
        }

        if (bestArea) {
          bestArea.countyFips.push(fips)
        } else {
          // Put it back if no other area found
          area.countyFips.push(fips)
        }
      }
    }

    area.isContiguous = true
  }

  // Recalculate demand and centroids after reassignment
  for (const area of processed) {
    const areaCounties = area.countyFips
      .map((f) => countyMap.get(f))
      .filter((c): c is County => c !== undefined)

    area.totalDemand = areaCounties.reduce((s, c) => s + c.demandTons, 0)
    if (areaCounties.length > 0) {
      area.centroid = computeCentroid(areaCounties.map((c) => c.centroid))
      area.boundary = mergedBoundary(areaCounties)
    }
  }

  // Remove empty areas
  return processed.filter((a) => a.countyFips.length > 0)
}
