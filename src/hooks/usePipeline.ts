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

    // --- OSM first ---
    setOSM({ status: 'loading', roadProgress: 0, railProgress: 0 })
    try {
      const osmResult = await loadOSMData(
        selectedTerritory.bbox,
        (progress) => setOSM({ roadProgress: progress }),
        (progress) => setOSM({ railProgress: progress }),
        (totalChunks, currentChunk) => setOSM({ totalChunks, currentChunk })
      )
      setOSM({
        status: 'complete',
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
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setOSM({ status: 'error', errorMessage: message })
    }

    // --- Infrastructure after OSM ---
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
      setInfra({ status: 'error', errorMessage: message })
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
