import { useCallback, useRef } from 'react'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import {
  clusterCountiesToAreas,
  clusterAreasToRegions,
  postProcess,
} from '@/services/clusteringEngine'
import type { County } from '@/types/index.ts'

/** Cached county reference data (loaded once from bundled JSON) */
let countyRefCache: { fips: string; name: string; state: string; centroid: [number, number] }[] | null = null

async function loadCountyRef(): Promise<Map<string, { name: string; state: string; centroid: [number, number] }>> {
  if (!countyRefCache) {
    try {
      const resp = await fetch('/data/counties-se-usa.json')
      if (resp.ok) {
        countyRefCache = await resp.json()
      }
    } catch {
      // Fallback: no reference data available
    }
  }
  const map = new Map<string, { name: string; state: string; centroid: [number, number] }>()
  if (countyRefCache) {
    for (const c of countyRefCache) {
      map.set(c.fips, { name: c.name, state: c.state, centroid: c.centroid })
    }
  }
  return map
}

/**
 * Build County objects from pipeline FAF data.
 * Groups FAF records by county FIPS, computing demand totals.
 * Uses real county centroids from bundled reference data when available.
 * Counties in the reference data with zero FAF demand are included
 * so they can be assigned to areas by geographic proximity.
 */
async function buildCountiesFromPipeline(
  fafRecords: { originFips: string; destFips: string; commodity: string; annualTons: number }[]
): Promise<County[]> {
  const countyDemand = new Map<string, { total: number; commodities: Record<string, number> }>()

  for (const rec of fafRecords) {
    // Accumulate demand at both origin and destination
    for (const fips of [rec.originFips, rec.destFips]) {
      if (!countyDemand.has(fips)) {
        countyDemand.set(fips, { total: 0, commodities: {} })
      }
      const entry = countyDemand.get(fips)!
      entry.total += rec.annualTons
      entry.commodities[rec.commodity] = (entry.commodities[rec.commodity] ?? 0) + rec.annualTons
    }
  }

  // Load real county reference data for accurate centroids
  const countyRef = await loadCountyRef()

  // Include reference counties that have zero FAF demand (not in any record).
  // Only include reference counties whose state matches states seen in FAF data,
  // so that small territories don't get flooded with unrelated counties.
  const fafStates = new Set<string>()
  for (const [fips] of countyDemand) {
    fafStates.add(fips.substring(0, 2))
  }
  for (const [fips] of countyRef) {
    if (!countyDemand.has(fips) && fafStates.has(fips.substring(0, 2))) {
      countyDemand.set(fips, { total: 0, commodities: {} })
    }
  }

  const counties: County[] = []
  let index = 0
  for (const [fips, data] of countyDemand) {
    const ref = countyRef.get(fips)

    // Use real centroid if available, otherwise generate from FIPS hash
    let lng: number, lat: number, name: string, state: string
    if (ref) {
      ;[lng, lat] = ref.centroid
      name = ref.name
      state = ref.state
    } else {
      const fipsNum = parseInt(fips, 10) || index
      lng = -72 - ((fipsNum * 7 + 13) % 40) * 0.5
      lat = 28 + ((fipsNum * 3 + 7) % 20) * 0.5
      name = `County ${fips}`
      state = fips.substring(0, 2)
    }

    counties.push({
      fips,
      name,
      state,
      centroid: [lng, lat],
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [lng - 0.15, lat - 0.15],
            [lng + 0.15, lat - 0.15],
            [lng + 0.15, lat + 0.15],
            [lng - 0.15, lat + 0.15],
            [lng - 0.15, lat - 0.15],
          ],
        ],
      },
      demandTons: data.total,
      peakDailyTons: data.total / 365,
      commodities: data.commodities,
    })
    index++
  }

  return counties
}

export function usePixelization() {
  const {
    areas,
    regions,
    pixelizationStatus,
    pixelizationProgress,
    pixelizationError,
    params,
    setCounties,
    setAreas,
    setRegions,
    setPixelizationStatus,
    setPixelizationProgress,
    setPixelizationError,
    resetPixelization,
  } = useNetworkStore()

  const { faf } = usePipelineStore()
  const cancelledRef = useRef(false)

  const runPixelization = useCallback(async () => {
    cancelledRef.current = false
    resetPixelization()
    setPixelizationStatus('running')
    setPixelizationProgress(10)

    try {
      // Build county data from FAF records (uses real centroids when available)
      const counties = await buildCountiesFromPipeline(faf.records)
      setCounties(counties)

      if (counties.length < 3) {
        setPixelizationError(
          `Too few counties (${counties.length}) for meaningful clustering. Try expanding the territory.`
        )
        setPixelizationStatus('error')
        return
      }

      if (cancelledRef.current) {
        setPixelizationStatus('cancelled')
        return
      }

      setPixelizationProgress(30)

      // Step 1: Cluster counties into areas
      const rawAreas = clusterCountiesToAreas(counties, params)
      if (cancelledRef.current) {
        setPixelizationStatus('cancelled')
        return
      }

      setPixelizationProgress(50)

      // Step 2: Post-process for contiguity
      const processedAreas = postProcess(rawAreas, counties)
      if (cancelledRef.current) {
        setPixelizationStatus('cancelled')
        return
      }

      setPixelizationProgress(70)
      setAreas(processedAreas)

      // Step 3: Cluster areas into regions
      const newRegions = clusterAreasToRegions(processedAreas, params)
      if (cancelledRef.current) {
        setPixelizationStatus('cancelled')
        return
      }

      setRegions(newRegions)
      setPixelizationProgress(100)
      setPixelizationStatus('complete')
    } catch (err) {
      if (!cancelledRef.current) {
        const message = err instanceof Error ? err.message : 'Unknown clustering error'
        setPixelizationError(message)
        setPixelizationStatus('error')
      }
    }
  }, [faf.records, params, setCounties, setAreas, setRegions, setPixelizationStatus, setPixelizationProgress, setPixelizationError, resetPixelization])

  const cancelPixelization = useCallback(() => {
    cancelledRef.current = true
    setPixelizationStatus('cancelled')
    resetPixelization()
  }, [setPixelizationStatus, resetPixelization])

  // Compute county count from FAF records (unique FIPS codes)
  const countyCount = (() => {
    const fipsSet = new Set<string>()
    for (const rec of faf.records) {
      fipsSet.add(rec.originFips)
      fipsSet.add(rec.destFips)
    }
    return fipsSet.size
  })()

  return {
    areas,
    regions,
    pixelizationStatus,
    pixelizationProgress,
    pixelizationError,
    params,
    countyCount,
    runPixelization,
    cancelPixelization,
  }
}
