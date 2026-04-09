import { useCallback, useMemo } from 'react'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import { useTerritoryStore } from '@/stores/territoryStore.ts'
import { loadFAFData } from '@/services/fafService.ts'
import { loadOSMData, estimateLoadingTime } from '@/services/osmService.ts'
import { loadInfrastructureData } from '@/services/infrastructureService.ts'

export function usePipeline() {
  const { faf, osm, infra, overallProgress, setFAF, setOSM, setInfra, resetPipeline } =
    usePipelineStore()
  const { selectedTerritory } = useTerritoryStore()

  const loadingEstimate = useMemo(() => {
    if (!selectedTerritory) return null
    return estimateLoadingTime(selectedTerritory.bbox)
  }, [selectedTerritory])

  const startPipeline = useCallback(async () => {
    resetPipeline()

    // FAF uses bundled data (no Overpass) — runs first, fast
    setFAF({ status: 'loading', progress: 0 })
    try {
      const result = await loadFAFData((progress) => {
        setFAF({ progress })
      }, selectedTerritory ?? undefined)
      setFAF({
        status: 'complete',
        progress: 100,
        records: result.records,
        totalTonnage: result.totalTonnage,
        countyPairCount: result.countyPairCount,
        commodityTypes: result.commodityTypes,
        skippedCount: result.skippedCount,
        isOfflineFallback: result.isOfflineFallback,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setFAF({ status: 'error', errorMessage: message })
    }

    // OSM and Infra both use Overpass API — run SEQUENTIALLY to avoid 429s.
    // The shared overpassClient queue serializes individual requests, but
    // running the services sequentially gives clearer progress feedback.

    if (!selectedTerritory) {
      setOSM({ status: 'error', errorMessage: 'No territory selected' })
      setInfra({ status: 'error', errorMessage: 'No territory selected' })
      return
    }

    // --- OSM first (graceful degradation: partial data on chunk failures) ---
    setOSM({ status: 'loading', roadProgress: 0, railProgress: 0 })
    try {
      const osmResult = await loadOSMData(
        selectedTerritory.bbox,
        (progress) => setOSM({ roadProgress: progress }),
        (progress) => setOSM({ railProgress: progress }),
        (totalChunks, currentChunk) => setOSM({ totalChunks, currentChunk })
      )

      // Determine status: complete, partial (some chunks failed), or empty
      const hasData = osmResult.roadSegments.length > 0 || osmResult.railSegments.length > 0
      const hasFailures = osmResult.failedChunks > 0
      let status: 'complete' | 'partial' | 'error' = 'complete'
      let errorMessage: string | undefined
      if (hasFailures && hasData) {
        status = 'partial'
        errorMessage = `${osmResult.failedChunks} of ${osmResult.totalChunks * 2} queries failed (Overpass API rate limited). Showing partial data — you can retry later for complete coverage.`
      } else if (hasFailures && !hasData) {
        status = 'error'
        errorMessage = `All Overpass API queries failed (rate limited). Try again in a few minutes.`
      }

      setOSM({
        status,
        errorMessage,
        roadProgress: 100,
        railProgress: 100,
        interstateCount: osmResult.interstateCount,
        highwayCount: osmResult.highwayCount,
        railroadCount: osmResult.railroadCount,
        yardCount: osmResult.yardCount,
        totalRoadKm: osmResult.totalRoadKm,
        totalRailKm: osmResult.totalRailKm,
        skippedCount: osmResult.skippedCount,
        totalChunks: osmResult.totalChunks,
        roadSegments: osmResult.roadSegments,
        railSegments: osmResult.railSegments,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setOSM({ status: 'error', errorMessage: message })
    }

    // --- Infrastructure after OSM (graceful: skip on total failure, proceed to clustering) ---
    setInfra({ status: 'loading', progress: 0 })
    try {
      const infraResult = await loadInfrastructureData(
        selectedTerritory.bbox,
        (progress) => {
          setInfra({ progress })
        }
      )
      setInfra({
        status: 'complete',
        progress: 100,
        sites: infraResult.sites,
        warehouseCount: infraResult.warehouseCount,
        terminalCount: infraResult.terminalCount,
        dcCount: infraResult.dcCount,
        portCount: infraResult.portCount,
        airportCount: infraResult.airportCount,
        railYardCount: infraResult.railYardCount,
        skippedCount: infraResult.skippedCount,
        duplicatesRemoved: infraResult.duplicatesRemoved,
        fewSitesWarning: infraResult.fewSitesWarning,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      // Graceful: mark as partial with empty sites so pipeline can continue
      setInfra({
        status: 'partial',
        progress: 100,
        errorMessage: `Infrastructure query failed (${message}). Proceeding without infrastructure sites — hub placement will use clustering only.`,
        sites: [],
        warehouseCount: 0,
        terminalCount: 0,
        dcCount: 0,
        portCount: 0,
        airportCount: 0,
        railYardCount: 0,
        skippedCount: 0,
        duplicatesRemoved: 0,
        fewSitesWarning: true,
      })
    }
  }, [setFAF, setOSM, setInfra, resetPipeline, selectedTerritory])

  return {
    faf,
    osm,
    infra,
    overallProgress,
    loadingEstimate,
    startPipeline,
    resetPipeline,
  }
}
