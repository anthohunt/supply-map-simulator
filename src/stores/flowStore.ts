import { create } from 'zustand'
import type { FreightFlow } from '@/types/index.ts'

export interface FlowFilters {
  originHubId: string | null
  destinationHubId: string | null
  commodity: string | null
  minVolume: number
}

export interface Corridor {
  id: string
  name: string
  hubIds: string[]
  totalThroughput: number
  commodities: Record<string, number>
  entryHubId: string
  exitHubId: string
}

interface FlowState {
  flows: FreightFlow[]
  flowsEnabled: boolean
  filters: FlowFilters
  selectedCorridorId: string | null
  corridors: Corridor[]
  /** When true, auto-generation is suppressed (set by clearFlows, reset by computeFlows) */
  flowsCleared: boolean

  setFlows: (flows: FreightFlow[]) => void
  setFlowsEnabled: (enabled: boolean) => void
  setFilter: (filter: Partial<FlowFilters>) => void
  clearFilters: () => void
  setSelectedCorridorId: (id: string | null) => void
  setCorridors: (corridors: Corridor[]) => void
  clearFlows: () => void
  resetFlows: () => void
}

const defaultFilters: FlowFilters = {
  originHubId: null,
  destinationHubId: null,
  commodity: null,
  minVolume: 0,
}

export const useFlowStore = create<FlowState>((set) => ({
  flows: [],
  flowsEnabled: false,
  filters: defaultFilters,
  selectedCorridorId: null,
  corridors: [],
  flowsCleared: false,

  setFlows: (flows) => set({ flows, flowsCleared: false }),
  setFlowsEnabled: (flowsEnabled) => set({ flowsEnabled }),
  setFilter: (filter) =>
    set((state) => ({ filters: { ...state.filters, ...filter } })),
  clearFilters: () => set({ filters: defaultFilters }),
  setSelectedCorridorId: (selectedCorridorId) => set({ selectedCorridorId }),
  setCorridors: (corridors) => set({ corridors }),
  clearFlows: () =>
    set({
      flows: [],
      corridors: [],
      flowsCleared: true,
    }),
  resetFlows: () =>
    set({
      flows: [],
      flowsEnabled: false,
      filters: defaultFilters,
      selectedCorridorId: null,
      corridors: [],
      flowsCleared: false,
    }),
}))

