import { useCallback, useRef } from 'react'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import {
  clusterCountiesToAreas,
  clusterAreasToRegions,
  postProcess,
} from '@/services/clusteringEngine'
import type { County } from '@/types/index.ts'

/**
 * Build County objects from pipeline FAF data.
 * Groups FAF records by county FIPS, computing demand totals.
 */
function buildCountiesFromPipeline(
  fafRecords: { originFips: string; destFips: string; commodity: string; annualTons: number }[]
): County[] {
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

  // Generate approximate centroids from FIPS codes
  // In a real implementation these come from territory boundary data
  // For now, distribute based on FIPS numeric value within reasonable US bbox
  const counties: County[] = []
  let index = 0
  for (const [fips, data] of countyDemand) {
    // Simple deterministic position from FIPS hash
    const fipsNum = parseInt(fips, 10) || index
    const lng = -72 - ((fipsNum * 7 + 13) % 40) * 0.5
    const lat = 28 + ((fipsNum * 3 + 7) % 20) * 0.5

    counties.push({
      fips,
      name: `County ${fips}`,
      state: fips.substring(0, 2),
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
      // Build county data from FAF records
      const counties = buildCountiesFromPipeline(faf.records)

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
  }, [faf.records, params, setAreas, setRegions, setPixelizationStatus, setPixelizationProgress, setPixelizationError, resetPixelization])

  const cancelPixelization = useCallback(() => {
    cancelledRef.current = true
    setPixelizationStatus('cancelled')
    resetPixelization()
  }, [setPixelizationStatus, resetPixelization])

  return {
    areas,
    regions,
    pixelizationStatus,
    pixelizationProgress,
    pixelizationError,
    params,
    runPixelization,
    cancelPixelization,
  }
}
