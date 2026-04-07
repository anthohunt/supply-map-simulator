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
  resetPipeline: () =>
    set({
      faf: initialFAF,
      osm: initialOSM,
      infra: initialInfra,
      overallProgress: 0,
    }),
}))
