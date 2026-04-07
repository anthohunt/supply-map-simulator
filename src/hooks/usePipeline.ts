import { useCallback } from 'react'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import { loadFAFData } from '@/services/fafService.ts'
import { loadOSMData } from '@/services/osmService.ts'
import { loadInfrastructureData } from '@/services/infrastructureService.ts'

export function usePipeline() {
  const { faf, osm, infra, overallProgress, setFAF, setOSM, setInfra, resetPipeline } =
    usePipelineStore()

  const startPipeline = useCallback(async () => {
    resetPipeline()

    // Start all three data sources in parallel
    const fafPromise = (async () => {
      setFAF({ status: 'loading', progress: 0 })
      try {
        const result = await loadFAFData((progress) => {
          setFAF({ progress })
        })
        setFAF({
          status: 'complete',
          progress: 100,
          records: result.records,
          totalTonnage: result.totalTonnage,
          countyPairCount: result.countyPairCount,
          commodityTypes: result.commodityTypes,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setFAF({ status: 'error', errorMessage: message })
      }
    })()

    const osmPromise = (async () => {
      setOSM({ status: 'loading', roadProgress: 0, railProgress: 0 })
      try {
        const result = await loadOSMData(
          (progress) => setOSM({ roadProgress: progress }),
          (progress) => setOSM({ railProgress: progress })
        )
        setOSM({
          status: 'complete',
          roadProgress: 100,
          railProgress: 100,
          interstateCount: result.interstateCount,
          highwayCount: result.highwayCount,
          railroadCount: result.railroadCount,
          yardCount: result.yardCount,
          totalRoadKm: result.totalRoadKm,
          totalRailKm: result.totalRailKm,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setOSM({ status: 'error', errorMessage: message })
      }
    })()

    const infraPromise = (async () => {
      setInfra({ status: 'loading', progress: 0 })
      try {
        const result = await loadInfrastructureData((progress) => {
          setInfra({ progress })
        })
        setInfra({
          status: 'complete',
          progress: 100,
          sites: result.sites,
          warehouseCount: result.warehouseCount,
          terminalCount: result.terminalCount,
          dcCount: result.dcCount,
          portCount: result.portCount,
          airportCount: result.airportCount,
          railYardCount: result.railYardCount,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setInfra({ status: 'error', errorMessage: message })
      }
    })()

    await Promise.allSettled([fafPromise, osmPromise, infraPromise])
  }, [setFAF, setOSM, setInfra, resetPipeline])

  return {
    faf,
    osm,
    infra,
    overallProgress,
    startPipeline,
    resetPipeline,
  }
}
