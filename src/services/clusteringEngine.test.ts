import { describe, it, expect } from 'vitest'
import {
  clusterCountiesToAreas,
  clusterAreasToRegions,
  postProcess,
} from './clusteringEngine'
import type { County, ClusteringParams } from '@/types/index.ts'

function makeCounty(
  fips: string,
  lng: number,
  lat: number,
  demandTons: number
): County {
  return {
    fips,
    name: `County ${fips}`,
    state: 'GA',
    centroid: [lng, lat],
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [lng - 0.1, lat - 0.1],
          [lng + 0.1, lat - 0.1],
          [lng + 0.1, lat + 0.1],
          [lng - 0.1, lat + 0.1],
          [lng - 0.1, lat - 0.1],
        ],
      ],
    },
    demandTons,
    peakDailyTons: demandTons / 365,
    commodities: { general: demandTons },
  }
}

const defaultParams: ClusteringParams = {
  targetRegions: 3,
  demandBalanceWeight: 0.5,
  contiguityWeight: 0.5,
  compactnessWeight: 0.5,
  maxIterations: 100,
}

// Two geographic clusters: Atlanta area (left) and Savannah area (right)
const testCounties: County[] = [
  // Atlanta cluster
  makeCounty('13121', -84.4, 33.75, 50000), // Fulton
  makeCounty('13089', -84.3, 33.65, 30000), // DeKalb
  makeCounty('13067', -84.5, 33.85, 20000), // Cobb
  makeCounty('13135', -84.2, 33.95, 15000), // Gwinnett
  // Savannah cluster
  makeCounty('13051', -81.1, 32.08, 25000), // Chatham
  makeCounty('13103', -81.0, 32.18, 10000), // Effingham
  makeCounty('13029', -81.2, 31.98, 8000),  // Bryan
  // Middle (Macon area)
  makeCounty('13021', -83.6, 32.85, 12000), // Bibb
  makeCounty('13153', -83.5, 32.75, 9000),  // Houston
]

describe('clusterCountiesToAreas', () => {
  it('clusters counties into the expected number of areas', () => {
    const areas = clusterCountiesToAreas(testCounties, {
      ...defaultParams,
      targetRegions: 3,
    })

    // With targetRegions=3, area count should be around 3x regions or scaled
    expect(areas.length).toBeGreaterThanOrEqual(3)
    expect(areas.length).toBeLessThanOrEqual(9) // never more than county count
  })

  it('assigns every county to exactly one area', () => {
    const areas = clusterCountiesToAreas(testCounties, defaultParams)

    const allFips = areas.flatMap((a) => a.countyFips)
    const uniqueFips = new Set(allFips)

    // Every county assigned
    expect(uniqueFips.size).toBe(testCounties.length)
    // No duplicates
    expect(allFips.length).toBe(uniqueFips.size)
  })

  it('computes correct totalDemand per area', () => {
    const areas = clusterCountiesToAreas(testCounties, defaultParams)

    for (const area of areas) {
      const expectedDemand = area.countyFips.reduce((sum, fips) => {
        const county = testCounties.find((c) => c.fips === fips)
        return sum + (county?.demandTons ?? 0)
      }, 0)
      expect(area.totalDemand).toBe(expectedDemand)
    }
  })

  it('computes centroids within county bounding box', () => {
    const areas = clusterCountiesToAreas(testCounties, defaultParams)

    for (const area of areas) {
      const counties = area.countyFips.map((f) =>
        testCounties.find((c) => c.fips === f)!
      )
      const lngs = counties.map((c) => c.centroid[0])
      const lats = counties.map((c) => c.centroid[1])

      expect(area.centroid[0]).toBeGreaterThanOrEqual(Math.min(...lngs) - 0.01)
      expect(area.centroid[0]).toBeLessThanOrEqual(Math.max(...lngs) + 0.01)
      expect(area.centroid[1]).toBeGreaterThanOrEqual(Math.min(...lats) - 0.01)
      expect(area.centroid[1]).toBeLessThanOrEqual(Math.max(...lats) + 0.01)
    }
  })

  it('handles single county by returning one area', () => {
    const areas = clusterCountiesToAreas([testCounties[0]], {
      ...defaultParams,
      targetRegions: 2,
    })
    expect(areas.length).toBe(1)
    expect(areas[0].countyFips).toEqual([testCounties[0].fips])
  })

  it('handles county with zero demand', () => {
    const counties = [
      ...testCounties,
      makeCounty('13999', -83.0, 33.0, 0),
    ]
    const areas = clusterCountiesToAreas(counties, defaultParams)

    const allFips = areas.flatMap((a) => a.countyFips)
    expect(allFips).toContain('13999')
  })
})

describe('clusterAreasToRegions', () => {
  it('groups areas into the target number of regions', () => {
    const areas = clusterCountiesToAreas(testCounties, {
      ...defaultParams,
      targetRegions: 3,
    })
    const regions = clusterAreasToRegions(areas, {
      ...defaultParams,
      targetRegions: 3,
    })

    expect(regions.length).toBeLessThanOrEqual(3)
    expect(regions.length).toBeGreaterThanOrEqual(1)
  })

  it('assigns every area to exactly one region', () => {
    const areas = clusterCountiesToAreas(testCounties, defaultParams)
    const regions = clusterAreasToRegions(areas, defaultParams)

    const allAreaIds = regions.flatMap((r) => r.areaIds)
    const uniqueAreaIds = new Set(allAreaIds)

    expect(uniqueAreaIds.size).toBe(areas.length)
    expect(allAreaIds.length).toBe(uniqueAreaIds.size)
  })

  it('computes region totalDemand as sum of area demands', () => {
    const areas = clusterCountiesToAreas(testCounties, defaultParams)
    const regions = clusterAreasToRegions(areas, defaultParams)

    for (const region of regions) {
      const expectedDemand = region.areaIds.reduce((sum, areaId) => {
        const area = areas.find((a) => a.id === areaId)
        return sum + (area?.totalDemand ?? 0)
      }, 0)
      expect(region.totalDemand).toBe(expectedDemand)
    }
  })

  it('assigns distinct colors to each region', () => {
    const areas = clusterCountiesToAreas(testCounties, defaultParams)
    const regions = clusterAreasToRegions(areas, defaultParams)

    const colors = regions.map((r) => r.color)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(regions.length)
  })
})

describe('postProcess', () => {
  it('returns areas with isContiguous flag set', () => {
    const areas = clusterCountiesToAreas(testCounties, defaultParams)
    const processed = postProcess(areas, testCounties)

    for (const area of processed) {
      expect(typeof area.isContiguous).toBe('boolean')
    }
  })

  it('does not lose any counties during post-processing', () => {
    const areas = clusterCountiesToAreas(testCounties, defaultParams)
    const processed = postProcess(areas, testCounties)

    const beforeFips = new Set(areas.flatMap((a) => a.countyFips))
    const afterFips = new Set(processed.flatMap((a) => a.countyFips))

    expect(afterFips.size).toBe(beforeFips.size)
    for (const fips of beforeFips) {
      expect(afterFips).toContain(fips)
    }
  })

  it('preserves area count', () => {
    const areas = clusterCountiesToAreas(testCounties, defaultParams)
    const processed = postProcess(areas, testCounties)
    expect(processed.length).toBe(areas.length)
  })
})
