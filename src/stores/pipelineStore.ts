import { create } from 'zustand'
import type { FAFRecord } from '@/types/index.ts'
import type { CandidateSite } from '@/types/site.ts'

export type DataSourceStatus = 'idle' | 'loading' | 'complete' | 'error'

interface FAFState {
  status: DataSourceStatus
  progress: number
  records: FAFRecord[]
  totalTonnage: number
  countyPairCount: number
  commodityTypes: string[]
  errorMessage: string | null
  skippedCount: number
  isOfflineFallback: boolean
  /** Set of disabled commodity types for filtering */
  disabledCommodities: Set<string>
  /** Filtered tonnage after applying commodity toggles */
  filteredTonnage: number
}

interface OSMState {
  status: DataSourceStatus
  roadProgress: number
  railProgress: number
  interstateCount: number
  highwayCount: number
  railroadCount: number
  yardCount: number
  totalRoadKm: number
  totalRailKm: number
  errorMessage: string | null
  skippedCount: number
  /** Number of bbox chunks being processed (1 = no chunking) */
  totalChunks: number
  /** Current chunk index being processed */
  currentChunk: number
}

interface InfraState {
  status: DataSourceStatus
  progress: number
  sites: CandidateSite[]
  warehouseCount: number
  terminalCount: number
  dcCount: number
  portCount: number
  airportCount: number
  railYardCount: number
  skippedCount: number
  duplicatesRemoved: number
  fewSitesWarning: boolean
  errorMessage: string | null
}

interface PipelineState {
  faf: FAFState
  osm: OSMState
  infra: InfraState
  overallProgress: number
  setFAF: (update: Partial<FAFState>) => void
  setOSM: (update: Partial<OSMState>) => void
  setInfra: (update: Partial<InfraState>) => void
  toggleCommodity: (commodity: string) => void
  resetPipeline: () => void
}

const initialFAF: FAFState = {
  status: 'idle',
  progress: 0,
  records: [],
  totalTonnage: 0,
  countyPairCount: 0,
  commodityTypes: [],
  errorMessage: null,
  skippedCount: 0,
  isOfflineFallback: false,
  disabledCommodities: new Set<string>(),
  filteredTonnage: 0,
}

const initialOSM: OSMState = {
  status: 'idle',
  roadProgress: 0,
  railProgress: 0,
  interstateCount: 0,
  highwayCount: 0,
  railroadCount: 0,
  yardCount: 0,
  totalRoadKm: 0,
  totalRailKm: 0,
  errorMessage: null,
  skippedCount: 0,
  totalChunks: 1,
  currentChunk: 0,
}

const initialInfra: InfraState = {
  status: 'idle',
  progress: 0,
  sites: [],
  warehouseCount: 0,
  terminalCount: 0,
  dcCount: 0,
  portCount: 0,
  airportCount: 0,
  railYardCount: 0,
  skippedCount: 0,
  duplicatesRemoved: 0,
  fewSitesWarning: false,
  errorMessage: null,
}

function computeOverallProgress(faf: FAFState, osm: OSMState, infra: InfraState): number {
  const fafWeight = 0.4
  const osmWeight = 0.35
  const infraWeight = 0.25

  const fafProgress = faf.status === 'complete' ? 100 : faf.progress
  const osmProgress =
    osm.status === 'complete'
      ? 100
      : (osm.roadProgress + osm.railProgress) / 2
  const infraProgress = infra.status === 'complete' ? 100 : infra.progress

  return Math.round(
    fafProgress * fafWeight +
      osmProgress * osmWeight +
      infraProgress * infraWeight
  )
}

export const usePipelineStore = create<PipelineState>((set) => ({
  faf: initialFAF,
  osm: initialOSM,
  infra: initialInfra,
  overallProgress: 0,
  setFAF: (update) => {
    set((state) => {
      const newFAF = { ...state.faf, ...update }
      // If records or totalTonnage changed, recompute filteredTonnage
      if (update.records || update.totalTonnage !== undefined) {
        newFAF.filteredTonnage = newFAF.records
          .filter((r) => !newFAF.disabledCommodities.has(r.commodity))
          .reduce((sum, r) => sum + r.annualTons, 0)
      }
      return {
        faf: newFAF,
        overallProgress: computeOverallProgress(newFAF, state.osm, state.infra),
      }
    })
  },
  setOSM: (update) => {
    set((state) => {
      const newOSM = { ...state.osm, ...update }
      return {
        osm: newOSM,
        overallProgress: computeOverallProgress(state.faf, newOSM, state.infra),
      }
    })
  },
  setInfra: (update) => {
    set((state) => {
      const newInfra = { ...state.infra, ...update }
      return {
        infra: newInfra,
        overallProgress: computeOverallProgress(state.faf, state.osm, newInfra),
      }
    })
  },
  toggleCommodity: (commodity: string) => {
    set((state) => {
      const newDisabled = new Set(state.faf.disabledCommodities)
      if (newDisabled.has(commodity)) {
        newDisabled.delete(commodity)
      } else {
        newDisabled.add(commodity)
      }
      // Recompute filtered tonnage
      const filteredTonnage = state.faf.records
        .filter((r) => !newDisabled.has(r.commodity))
        .reduce((sum, r) => sum + r.annualTons, 0)
      return {
        faf: {
          ...state.faf,
          disabledCommodities: newDisabled,
          filteredTonnage,
        },
      }
    })
  },
  resetPipeline: () =>
    set({
      faf: initialFAF,
      osm: initialOSM,
      infra: initialInfra,
      overallProgress: 0,
    }),
}))
